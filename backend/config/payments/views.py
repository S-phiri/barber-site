import os
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Order, Payment
from .payfast import build_signature, verify_signature, get_base_url


def ping(request): 
    return JsonResponse({"ok": True})


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated for now
def checkout(request):
    """
    Create a PayFast checkout session.
    
    Expected payload:
    {
        "slot_id": "slot_123",
        "amount_cents": 5000,
        "description": "Haircut appointment"
    }
    """
    try:
        slot_id = request.data.get('slot_id')
        amount_cents = request.data.get('amount_cents')
        description = request.data.get('description', 'Booking payment')
        
        if not all([slot_id, amount_cents]):
            return Response(
                {"error": "Missing required fields: slot_id, amount_cents"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create order
        order = Order.objects.create(
            user=request.user if request.user.is_authenticated else None,
            amount_cents=amount_cents,
            description=description,
            slot_ref=slot_id,
            status='pending'
        )
        
        # Build PayFast parameters
        payfast_params = {
            'merchant_id': settings.PAYFAST_MERCHANT_ID,
            'merchant_key': settings.PAYFAST_MERCHANT_KEY,
            'amount': str(amount_cents / 100),  # Convert cents to rands
            'item_name': description,
            'return_url': settings.PAYFAST_RETURN_URL,
            'cancel_url': settings.PAYFAST_CANCEL_URL,
            'notify_url': settings.PAYFAST_NOTIFY_URL,
            'custom_str1': str(order.id),  # Pass order ID for webhook identification
        }
        
        # Generate signature
        signature = build_signature(payfast_params, settings.PAYFAST_PASSPHRASE)
        payfast_params['signature'] = signature
        
        # Get PayFast target URL
        target_url = f"{get_base_url(settings.PAYFAST_MODE)}/eng/process"
        
        return Response({
            'order_id': str(order.id),
            'target_url': target_url,
            'form_fields': payfast_params
        })
        
    except Exception as e:
        return Response(
            {"error": f"Checkout failed: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@require_http_methods(["POST"])
def notify(request):
    """
    Handle PayFast webhook notifications (ITN).
    """
    try:
        # Get PayFast parameters from POST data
        payfast_data = request.POST.dict()
        
        if not payfast_data:
            return HttpResponse("No data received", status=400)
        
        # Verify signature
        if not verify_signature(payfast_data, settings.PAYFAST_PASSPHRASE):
            return HttpResponse("Invalid signature", status=400)
        
        # Verify merchant_id matches
        if payfast_data.get('merchant_id') != settings.PAYFAST_MERCHANT_ID:
            return HttpResponse("Invalid merchant ID", status=400)
        
        # Get order ID from custom_str1
        order_id = payfast_data.get('custom_str1')
        if not order_id:
            return HttpResponse("No order ID", status=400)
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return HttpResponse("Order not found", status=404)
        
        # Verify amount matches
        expected_amount = str(order.amount_cents / 100)
        if payfast_data.get('amount') != expected_amount:
            return HttpResponse("Amount mismatch", status=400)
        
        # Create payment record
        payment = Payment.objects.create(
            order=order,
            pf_payment_id=payfast_data.get('pf_payment_id'),
            status='pending',
            raw_payload=payfast_data
        )
        
        # Process payment status
        payment_status = payfast_data.get('payment_status', '').upper()
        
        if payment_status == 'COMPLETE':
            payment.status = 'success'
            order.status = 'paid'
            payment.save()
            order.save()
            
        elif payment_status in ['CANCELLED', 'FAILED']:
            payment.status = 'cancelled' if payment_status == 'CANCELLED' else 'failed'
            order.status = 'cancelled'
            payment.save()
            order.save()
        
        return HttpResponse("OK", status=200)
        
    except Exception as e:
        return HttpResponse(f"Webhook error: {str(e)}", status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def order_status(request, order_id):
    """
    Get order status for frontend polling.
    """
    try:
        order = get_object_or_404(Order, id=order_id)
        
        return Response({
            'status': order.status
        })
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get order status: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
