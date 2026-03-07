from typing import Dict
from .config import DEFAULTS_UNBIAS, DEFAULTS_DBIAS, ALLOWED_UNBIAS_KEYS, ALLOWED_DBIAS_KEYS


def merge_config(defaults: Dict, overrides: Dict | None) -> Dict:
    """Return a new config dict by merging overrides onto defaults.

    Non-recursive shallow merge.
    """
    if not overrides:
        return defaults.copy()
    merged = defaults.copy()
    for k, v in overrides.items():
        merged[k] = v
    return merged


def validate_config(keys: set, config: Dict) -> None:
    """Raise ValueError if config contains unknown keys."""
    unknown = set(config.keys()) - keys
    if unknown:
        raise ValueError(f"Unknown config keys: {unknown}")
