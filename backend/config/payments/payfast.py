"""
PayFast integration helpers for Django.
Handles signature building, verification, and URL generation.
"""
import hashlib
import urllib.parse
from typing import Dict, Any
from django.conf import settings


def build_signature(params: Dict[str, Any], passphrase: str) -> str:
    """
    Build PayFast signature from parameters and passphrase.
    
    Args:
        params: Dictionary of PayFast parameters
        passphrase: PayFast passphrase from settings
        
    Returns:
        MD5 signature string
    """
    # Remove empty values and signature field
    clean_params = {k: v for k, v in params.items() if v and k != 'signature'}
    
    # Sort parameters alphabetically
    sorted_params = sorted(clean_params.items())
    
    # Create query string
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    # Add passphrase
    query_string += f"&passphrase={passphrase}"
    
    # Generate MD5 hash
    signature = hashlib.md5(query_string.encode('utf-8')).hexdigest()
    
    return signature


def verify_signature(params: Dict[str, Any], passphrase: str) -> bool:
    """
    Verify PayFast signature from webhook parameters.
    
    Args:
        params: Dictionary of PayFast parameters from webhook
        passphrase: PayFast passphrase from settings
        
    Returns:
        True if signature is valid, False otherwise
    """
    received_signature = params.get('signature', '')
    if not received_signature:
        return False
    
    # Build expected signature
    expected_signature = build_signature(params, passphrase)
    
    return received_signature.lower() == expected_signature.lower()


def get_base_url(mode: str) -> str:
    """
    Get PayFast base URL based on mode.
    
    Args:
        mode: 'sandbox' or 'live'
        
    Returns:
        PayFast base URL
    """
    if mode == 'live':
        return 'https://www.payfast.co.za'
    else:  # sandbox
        return 'https://sandbox.payfast.co.za'


def get_checkout_url() -> str:
    """
    Get PayFast checkout URL based on current mode.
    
    Returns:
        Full PayFast checkout URL
    """
    mode = getattr(settings, 'PAYFAST_MODE', 'sandbox')
    base_url = get_base_url(mode)
    return f"{base_url}/eng/process"


def get_webhook_url() -> str:
    """
    Get PayFast webhook URL based on current mode.
    
    Returns:
        Full PayFast webhook URL
    """
    mode = getattr(settings, 'PAYFAST_MODE', 'sandbox')
    base_url = get_base_url(mode)
    return f"{base_url}/eng/query/validate"
