"""
============================================================
StudyAI Backend — Logger Utility
============================================================
Provides a pre-configured logger that writes to both the
console (coloured) and a rotating file in logs/.
"""

import io
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from config import get_config

Config = get_config()

# ── Colour codes for terminal output ─────────────────────
_COLOURS = {
    "DEBUG":    "\033[36m",   # Cyan
    "INFO":     "\033[32m",   # Green
    "WARNING":  "\033[33m",   # Yellow
    "ERROR":    "\033[31m",   # Red
    "CRITICAL": "\033[41m",   # Red background
    "RESET":    "\033[0m",
}


class _ColourFormatter(logging.Formatter):
    """Custom formatter that adds ANSI colour codes to level names."""

    FMT = "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s"
    DATE_FMT = "%Y-%m-%d %H:%M:%S"

    def format(self, record: logging.LogRecord) -> str:
        colour = _COLOURS.get(record.levelname, _COLOURS["RESET"])
        reset = _COLOURS["RESET"]
        record.levelname = f"{colour}{record.levelname}{reset}"
        formatter = logging.Formatter(self.FMT, datefmt=self.DATE_FMT)
        return formatter.format(record)


def get_logger(name: str = "studyai") -> logging.Logger:
    """
    Return a named logger with both console and rotating file handlers.

    Args:
        name: Logger name — typically the module's ``__name__``.

    Returns:
        Configured :class:`logging.Logger` instance.
    """
    logger = logging.getLogger(name)

    # Avoid duplicate handlers if called multiple times
    if logger.handlers:
        return logger

    level = getattr(logging, Config.LOG_LEVEL.upper(), logging.DEBUG)
    logger.setLevel(level)

    # ── Console handler (coloured, UTF-8 safe on Windows) ──
    # Wrap stdout in a UTF-8 TextIOWrapper so emoji/arrow characters
    # don't raise UnicodeEncodeError on Windows cp1252 terminals.
    try:
        utf8_stdout = io.TextIOWrapper(
            sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
        )
    except AttributeError:
        # sys.stdout may not have .buffer in some environments (e.g. pytest capture)
        utf8_stdout = sys.stdout

    console_handler = logging.StreamHandler(utf8_stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(_ColourFormatter())
    logger.addHandler(console_handler)

    # ── File handler (rotating, plain text) ───────────────
    Config.LOG_FOLDER.mkdir(parents=True, exist_ok=True)
    log_file: Path = Config.LOG_FOLDER / "studyai.log"

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,   # 5 MB per file
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    plain_fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(plain_fmt)
    logger.addHandler(file_handler)

    # Prevent propagation to the root logger
    logger.propagate = False
    return logger


# ── Module-level convenience logger ──────────────────────
logger = get_logger("studyai")
