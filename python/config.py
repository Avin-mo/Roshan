# Default configuration values for unbias and dbias initializers
DEFAULTS_UNBIAS = {
    "model": "unbias-base",
    "threshold": 0.5,
    "device": "cpu",
}

DEFAULTS_DBIAS = {
    "model": "dbias-base",
    "strength": 0.5,
    "device": "cpu",
}

# Allowed config keys (optional) - used for validation in future
ALLOWED_UNBIAS_KEYS = set(DEFAULTS_UNBIAS.keys())
ALLOWED_DBIAS_KEYS = set(DEFAULTS_DBIAS.keys())
