# Minimal initializer for the hypothetical 'dbias' library
from typing import Dict
from .config import DEFAULTS_DBIAS, ALLOWED_DBIAS_KEYS
from .utils import merge_config, validate_config


class DbiasClient:
    """Lightweight wrapper that represents an initialized dbias client."""

    def __init__(self, model: str, strength: float, device: str):
        self.model = model
        self.strength = strength
        self.device = device

    def summarize(self) -> Dict:
        return {"model": self.model, "strength": self.strength, "device": self.device}


def setup_dbias(config: Dict | None = None) -> DbiasClient:
    """Initialize and return a DbiasClient.

    This function merges provided config with defaults and validates keys. In a
    real project this would import and configure the actual dbias library.
    """
    cfg = merge_config(DEFAULTS_DBIAS, config)
    validate_config(ALLOWED_DBIAS_KEYS, cfg)

    # Example of real initialization:
    # import dbias
    # client = dbias.Client(model=cfg['model'], strength=cfg['strength'], device=cfg['device'])
    # return client

    return DbiasClient(model=cfg["model"], strength=cfg["strength"], device=cfg["device"])
