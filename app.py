import hashlib
import os
import secrets
import sys
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import boto3
from authlib.integrations.flask_client import OAuth
from flask import Flask, jsonify, redirect, render_template, request, url_for, flash
from flask_login import LoginManager, UserMixin, current_user, login_required, login_user, logout_user
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, text
from werkzeug.security import check_password_hash, generate_password_hash

APP_ROOT = Path(__file__).resolve().parent
WORDS_FILE = APP_ROOT / "words.txt"
WORDS_ES_FILE = APP_ROOT / "words_es.txt"
WORDS_FR_FILE = APP_ROOT / "words-fr.txt"
WORDS_DE_FILE = APP_ROOT / "words-ger.txt"
WORDS_PT_FILE = APP_ROOT / "words-port.txt"

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret")
database_url = os.environ.get("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = database_url or f"sqlite:///{APP_ROOT / 'typing.db'}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
running_alembic = any("alembic" in arg for arg in sys.argv)
auto_create_db = os.environ.get("AUTO_CREATE_DB", "true").lower() == "true" and not running_alembic

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"
oauth = OAuth(app)
google_oauth = oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

db_scheme = app.config["SQLALCHEMY_DATABASE_URI"].split(":", 1)[0]
google_ready = bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))
print(
    f"[startup] db_scheme={db_scheme} google_oauth_configured={google_ready} auto_create_db={auto_create_db}",
    flush=True,
)


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(40), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=True)
    timezone = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class TestResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    wpm = db.Column(db.Integer, nullable=False)
    raw_wpm = db.Column(db.Integer, nullable=False, default=0)
    accuracy = db.Column(db.Integer, nullable=False)
    duration_seconds = db.Column(db.Integer, nullable=False)
    char_count = db.Column(db.Integer, nullable=False)
    correct_chars = db.Column(db.Integer, nullable=False, default=0)
    incorrect_chars = db.Column(db.Integer, nullable=False, default=0)
    extra_chars = db.Column(db.Integer, nullable=False, default=0)
    missed_chars = db.Column(db.Integer, nullable=False, default=0)
    language = db.Column(db.String(8), nullable=True)
    caps_enabled = db.Column(db.Boolean, nullable=True, default=False)
    accents_enabled = db.Column(db.Boolean, nullable=True, default=False)
    punctuation_enabled = db.Column(db.Boolean, nullable=True, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref=db.backref("results", lazy=True))


class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref=db.backref("reset_tokens", lazy=True))

def load_words(path: Path) -> list[str]:
    if not path.exists():
        return []
    words = [line.strip() for line in path.read_text(encoding="utf-8").splitlines()]
    return [w for w in words if len(w) > 2]


WORDS_CACHE = load_words(WORDS_FILE)
WORDS_ES_CACHE = load_words(WORDS_ES_FILE)
WORDS_FR_CACHE = load_words(WORDS_FR_FILE)
WORDS_DE_CACHE = load_words(WORDS_DE_FILE)
WORDS_PT_CACHE = load_words(WORDS_PT_FILE)

def ensure_sqlite_columns():
    if not app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        return
    columns = {
        "raw_wpm": "INTEGER DEFAULT 0",
        "correct_chars": "INTEGER DEFAULT 0",
        "incorrect_chars": "INTEGER DEFAULT 0",
        "extra_chars": "INTEGER DEFAULT 0",
        "missed_chars": "INTEGER DEFAULT 0",
        "language": "VARCHAR(8)",
        "caps_enabled": "BOOLEAN DEFAULT 0",
        "accents_enabled": "BOOLEAN DEFAULT 0",
        "punctuation_enabled": "BOOLEAN DEFAULT 0",
    }
    existing = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(test_result)")).fetchall()
    }
    for column, col_type in columns.items():
        if column not in existing:
            db.session.execute(text(f"ALTER TABLE test_result ADD COLUMN {column} {col_type}"))
    user_columns = {
        "timezone": "VARCHAR(64)",
    }
    user_existing = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    }
    for column, col_type in user_columns.items():
        if column not in user_existing:
            db.session.execute(text(f"ALTER TABLE user ADD COLUMN {column} {col_type}"))
    db.session.commit()


with app.app_context():
    if auto_create_db and app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        db.create_all()
        ensure_sqlite_columns()


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@app.route("/")
def index():
    summary = None
    if current_user.is_authenticated and current_user.username:
        summary = get_user_summary(current_user.id)
    return render_template("index.html", summary=summary)


@app.route("/api/words")
def api_words():
    count = request.args.get("count", default=200, type=int)
    lang = request.args.get("lang", default="en", type=str)
    if lang == "es":
        words = WORDS_ES_CACHE
    elif lang == "fr":
        words = WORDS_FR_CACHE
    elif lang == "de":
        words = WORDS_DE_CACHE
    elif lang == "pt":
        words = WORDS_PT_CACHE
    else:
        words = WORDS_CACHE
    if not words:
        return jsonify({"words": []})

    if count <= 0:
        count = 200

    if len(words) >= count:
        sample = random.sample(words, count)
    else:
        sample = random.choices(words, k=count)

    return jsonify({"words": sample})


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for("profile"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")
        if not email or not username or not password:
            flash("Email, username, and password are required.")
            return render_template("signup.html")
        if password != confirm:
            flash("Passwords do not match.")
            return render_template("signup.html")
        if User.query.filter_by(email=email).first():
            flash("Email is already registered.")
            return render_template("signup.html")
        if User.query.filter_by(username=username).first():
            flash("Username is already taken.")
            return render_template("signup.html")
        user = User(
            email=email,
            username=username,
            password_hash=generate_password_hash(password),
        )
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for("index"))
    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("profile"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()
        if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
            flash("Invalid email or password.")
            return render_template("login.html")
        login_user(user)
        return redirect(url_for("index"))
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))


@app.route("/auth/google")
def auth_google():
    if not os.environ.get("GOOGLE_CLIENT_ID") or not os.environ.get("GOOGLE_CLIENT_SECRET"):
        flash("Google login is not configured.")
        return redirect(url_for("login"))
    redirect_uri = url_for("auth_google_callback", _external=True)
    return google_oauth.authorize_redirect(redirect_uri)


@app.route("/auth/google/callback")
def auth_google_callback():
    try:
        token = google_oauth.authorize_access_token()
        userinfo = token.get("userinfo") or google_oauth.parse_id_token(token)
    except Exception:
        flash("Google sign-in failed. Try again.")
        return redirect(url_for("login"))
    if not userinfo:
        flash("Could not fetch Google profile.")
        return redirect(url_for("login"))
    email = (userinfo.get("email") or "").lower()
    sub = userinfo.get("sub")
    user = User.query.filter_by(google_sub=sub).first() if sub else None
    if not user and email:
        user = User.query.filter_by(email=email).first()
    if not user:
        username_seed = (userinfo.get("given_name") or email.split("@")[0] if email else "user").strip()
        username = username_seed[:40]
        if not username:
            username = "user"
        if User.query.filter_by(username=username).first():
            username = None
        user = User(email=email or f"google-{sub}@example.com", username=username, google_sub=sub)
        db.session.add(user)
        db.session.commit()
    login_user(user)
    if not user.username:
        flash("Set a username to finish your profile.")
        return redirect(url_for("profile"))
    return redirect(url_for("index"))


def calculate_streaks(results):
    dates = sorted({result.created_at.date() for result in results})
    if not dates:
        return 0, 0
    longest = 1
    current = 1
    run = 1
    for i in range(1, len(dates)):
        if dates[i] == dates[i - 1] + timedelta(days=1):
            run += 1
            longest = max(longest, run)
        else:
            run = 1
    today = datetime.utcnow().date()
    if dates[-1] == today:
        current = 1
        for i in range(len(dates) - 1, 0, -1):
            if dates[i] == dates[i - 1] + timedelta(days=1):
                current += 1
            else:
                break
    else:
        current = 0
    return current, longest


def format_datetime_for_user(dt, tz_name):
    if not dt:
        return ""
    try:
        tz = ZoneInfo(tz_name) if tz_name else timezone.utc
    except Exception:
        tz = timezone.utc
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(tz).strftime("%b %d, %Y %H:%M")


def send_reset_email(to_email, reset_link):
    from_email = os.environ.get("SES_FROM_EMAIL")
    region = os.environ.get("AWS_REGION")
    if not from_email or not region:
        app.logger.warning("SES not configured; missing SES_FROM_EMAIL or AWS_REGION.")
        return False
    try:
        client = boto3.client("ses", region_name=region)
        subject = "Reset your ChecoType password"
        body_text = (
            "Use the link below to reset your ChecoType password. "
            "This link expires in 1 hour.\n\n"
            f"{reset_link}\n\n"
            "If you did not request this, you can ignore this email."
        )
        body_html = f"""
        <p>Use the link below to reset your ChecoType password. This link expires in 1 hour.</p>
        <p><a href="{reset_link}">Reset your password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
        """
        client.send_email(
            Source=from_email,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body_text}, "Html": {"Data": body_html}},
            },
        )
        return True
    except Exception:
        app.logger.exception("Failed to send reset email")
        return False


def get_user_summary(user_id: int):
    avg_wpm, avg_accuracy = db.session.query(
        func.avg(TestResult.wpm),
        func.avg(TestResult.accuracy),
    ).filter(TestResult.user_id == user_id).one()
    fastest_wpm = (
        db.session.query(func.max(TestResult.wpm)).filter(TestResult.user_id == user_id).scalar()
    )
    fastest_raw_wpm = (
        db.session.query(func.max(TestResult.raw_wpm))
        .filter(TestResult.user_id == user_id)
        .scalar()
    )
    best_accuracy = (
        db.session.query(func.max(TestResult.accuracy))
        .filter(TestResult.user_id == user_id)
        .scalar()
    )
    total_tests = db.session.query(func.count(TestResult.id)).filter(TestResult.user_id == user_id).scalar()
    all_results = TestResult.query.filter_by(user_id=user_id).all()
    current_streak, longest_streak = calculate_streaks(all_results)
    totals = db.session.query(
        func.sum(TestResult.correct_chars),
        func.sum(TestResult.incorrect_chars),
        func.sum(TestResult.extra_chars),
        func.sum(TestResult.missed_chars),
    ).filter(TestResult.user_id == user_id).one()
    return {
        "avg_wpm": int(avg_wpm or 0),
        "avg_accuracy": int(avg_accuracy or 0),
        "fastest_wpm": int(fastest_wpm or 0),
        "fastest_raw_wpm": int(fastest_raw_wpm or 0),
        "best_accuracy": int(best_accuracy or 0),
        "total_tests": int(total_tests or 0),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "correct_chars": int(totals[0] or 0),
        "incorrect_chars": int(totals[1] or 0),
        "extra_chars": int(totals[2] or 0),
        "missed_chars": int(totals[3] or 0),
    }


@app.before_request
def require_username():
    if not current_user.is_authenticated:
        return
    if current_user.username:
        return
    allowed = {
        "profile",
        "logout",
        "auth_google",
        "auth_google_callback",
        "login",
        "signup",
        "static",
    }
    if request.endpoint in allowed or request.path.startswith("/static"):
        return
    return redirect(url_for("profile"))


@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        current_password = request.form.get("current_password", "")
        new_password = request.form.get("new_password", "")
        confirm_password = request.form.get("confirm_password", "")

        if request.form.get("update_username"):
            if not username:
                flash("Username cannot be empty.")
            elif User.query.filter(User.username == username, User.id != current_user.id).first():
                flash("That username is already taken.")
            else:
                current_user.username = username
                db.session.commit()
                flash("Username updated.")
            return redirect(url_for("profile"))

        if request.form.get("update_password"):
            if current_user.password_hash:
                if not check_password_hash(current_user.password_hash, current_password):
                    flash("Current password is incorrect.")
                    return redirect(url_for("profile"))
            if not new_password or new_password != confirm_password:
                flash("New passwords do not match.")
                return redirect(url_for("profile"))
            current_user.password_hash = generate_password_hash(new_password)
            db.session.commit()
            flash("Password updated.")
            return redirect(url_for("profile"))

    summary = get_user_summary(current_user.id)
    recent_results = (
        TestResult.query.filter_by(user_id=current_user.id)
        .order_by(TestResult.created_at.desc())
        .limit(30)
        .all()
    )
    return render_template(
        "profile.html",
        results=recent_results,
        summary=summary,
        format_dt=lambda dt: format_datetime_for_user(dt, current_user.timezone),
    )


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        user = User.query.filter_by(email=email).first()
        if user:
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            reset_token = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )
            db.session.add(reset_token)
            db.session.commit()
            base_url = os.environ.get("APP_BASE_URL") or request.url_root.rstrip("/")
            reset_link = f"{base_url}{url_for('password_reset_token', token=token)}"
            send_reset_email(user.email, reset_link)
        flash("If that email exists, a reset link has been sent.")
        return redirect(url_for("login"))
    return render_template("forgot_password.html")


@app.route("/reset-password")
def reset_password_redirect():
    return redirect(url_for("forgot_password"))


@app.route("/reset/<token>", methods=["GET", "POST"])
def password_reset_token(token):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    reset = PasswordResetToken.query.filter_by(token_hash=token_hash, used_at=None).first()
    if not reset or reset.expires_at < datetime.utcnow():
        flash("This reset link is invalid or has expired.")
        return redirect(url_for("forgot_password"))

    if request.method == "POST":
        new_password = request.form.get("new_password", "")
        confirm_password = request.form.get("confirm_password", "")
        if not new_password or new_password != confirm_password:
            flash("New passwords do not match.")
            return render_template("reset_token.html")
        reset.user.password_hash = generate_password_hash(new_password)
        reset.used_at = datetime.utcnow()
        db.session.commit()
        flash("Password updated. You can sign in now.")
        return redirect(url_for("login"))

    return render_template("reset_token.html")

@app.route("/api/results", methods=["POST"])
@login_required
def api_results():
    if not current_user.username:
        return jsonify({"error": "Set username first"}), 403
    payload = request.get_json(silent=True) or {}
    try:
        wpm = int(payload.get("wpm", 0))
        raw_wpm = int(payload.get("rawWpm", 0))
        accuracy = int(payload.get("accuracy", 0))
        duration = int(payload.get("duration", 0))
        char_count = int(payload.get("chars", 0))
        correct_chars = int(payload.get("correctChars", 0))
        incorrect_chars = int(payload.get("incorrectChars", 0))
        extra_chars = int(payload.get("extraChars", 0))
        missed_chars = int(payload.get("missedChars", 0))
        language = (payload.get("language") or "").strip() or None
        caps_enabled = bool(payload.get("capsEnabled"))
        accents_enabled = bool(payload.get("accentsEnabled"))
        punctuation_enabled = bool(payload.get("punctuationEnabled"))
        tz_name = (payload.get("timezone") or "").strip()
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid payload"}), 400
    if duration <= 0:
        return jsonify({"error": "Invalid duration"}), 400
    result = TestResult(
        user_id=current_user.id,
        wpm=max(wpm, 0),
        raw_wpm=max(raw_wpm, 0),
        accuracy=max(min(accuracy, 100), 0),
        duration_seconds=duration,
        char_count=max(char_count, 0),
        correct_chars=max(correct_chars, 0),
        incorrect_chars=max(incorrect_chars, 0),
        extra_chars=max(extra_chars, 0),
        missed_chars=max(missed_chars, 0),
        language=language,
        caps_enabled=caps_enabled,
        accents_enabled=accents_enabled,
        punctuation_enabled=punctuation_enabled,
    )
    db.session.add(result)
    if tz_name:
        try:
            ZoneInfo(tz_name)
        except Exception:
            tz_name = ""
        if tz_name:
            current_user.timezone = tz_name
    db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/timezone", methods=["POST"])
@login_required
def api_timezone():
    payload = request.get_json(silent=True) or {}
    tz_name = (payload.get("timezone") or "").strip()
    if tz_name:
        try:
            ZoneInfo(tz_name)
        except Exception:
            return jsonify({"error": "Invalid timezone"}), 400
        current_user.timezone = tz_name
        db.session.commit()
    return jsonify({"ok": True})


@app.route("/api/debug-config")
def api_debug_config():
    token = os.environ.get("DEBUG_CONFIG_TOKEN")
    if not token or request.args.get("token") != token:
        return jsonify({"error": "Not found"}), 404
    user_count = db.session.query(func.count(User.id)).scalar()
    return jsonify(
        {
            "db_scheme": app.config["SQLALCHEMY_DATABASE_URI"].split(":", 1)[0],
            "google_ready": google_ready,
            "auto_create_db": auto_create_db,
            "user_count": int(user_count or 0),
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
