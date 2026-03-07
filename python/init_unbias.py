# Minimal initializer for the hypothetical 'unbias' library
from typing import Dict
from .config import DEFAULTS_UNBIAS, ALLOWED_UNBIAS_KEYS
from .utils import merge_config, validate_config


class UnbiasClient:
    """Lightweight wrapper that represents an initialized unbias client."""

    def __init__(self, model: str, threshold: float, device: str):
        self.model = model
        self.threshold = threshold
        self.device = device

    def summarize(self) -> Dict:
        return {"model": self.model, "threshold": self.threshold, "device": self.device}


def setup_unbias(config: Dict | None = None) -> UnbiasClient:
    """Initialize and return a UnbiasClient.

    This function merges provided config with defaults and validates keys. In a
    real project this would import and configure the actual unbias library.
    """
    cfg = merge_config(DEFAULTS_UNBIAS, config)
    validate_config(ALLOWED_UNBIAS_KEYS, cfg)

    # Here you would normally initialize the real library, e.g.:
    # import unbias
    # client = unbias.Client(model=cfg['model'], threshold=cfg['threshold'], device=cfg['device'])
    # return client

    return UnbiasClient(model=cfg["model"], threshold=cfg["threshold"], device=cfg["device"])
