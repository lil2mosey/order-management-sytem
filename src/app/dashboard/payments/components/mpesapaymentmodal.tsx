'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Smartphone, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (response: any) => void;
}

export default function MpesaPaymentModal({ isOpen, onClose, order, onSuccess }: MpesaPaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');

  const validatePhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid Safaricom number (07XX or 01XX)
    if (cleaned.length === 10 && (cleaned.startsWith('07') || cleaned.startsWith('01'))) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
      return '254' + cleaned;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = validatePhoneNumber(phoneNumber);
    if (!formattedPhone) {
      toast.error('Please enter a valid M-PESA phone number (e.g., 0712345678)');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Simulate M-PESA STK push (replace with actual API call)
      await simulateMpesaStkPush({
        phoneNumber: formattedPhone,
        amount: order?.amount,
        orderId: order?.orderId,
        customerName: order?.customerName
      });

      setStep('success');
      
      // Show success message
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">✓ STK Push Sent!</span>
          <span className="text-sm">Please check your phone to complete the payment</span>
        </div>,
        { duration: 6000 }
      );
      
      // Wait a bit before closing
      setTimeout(() => {
        onSuccess({ success: true });
        handleClose();
      }, 3000);
      
    } catch (error) {
      toast.error('Failed to initiate payment. Please try again.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  // Simulate M-PESA API call (replace with actual implementation)
  const simulateMpesaStkPush = async (data: any) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('M-PESA STK Push initiated:', data);
        resolve({
          success: true,
          message: 'STK Push sent successfully',
          data: {
            MerchantRequestID: '12345',
            CheckoutRequestID: 'ws_CO_' + Date.now(),
            ResponseCode: '0',
            ResponseDescription: 'Success. Request accepted for processing',
            CustomerMessage: 'Success. Request accepted for processing'
          }
        });
      }, 2000);
    });
  };

  const handleClose = () => {
    setStep('input');
    setPhoneNumber('');
    onClose();
  };

  const getAmount = () => {
    return order?.amount || 0;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900"
                  >
                    M-PESA Payment
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close payment modal"
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Order Summary */}
                {order && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-2">Order Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order ID:</span>
                        <span className="font-medium text-gray-900">#{order.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer:</span>
                        <span className="font-medium text-gray-900">{order.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item:</span>
                        <span className="font-medium text-gray-900">{order.item}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-700">Total:</span>
                        <span className="text-green-600">KES {getAmount().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'input' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        M-PESA Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g., 0712345678"
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-gray-900"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Enter the M-PESA registered phone number
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">What happens next?</p>
                          <p>An STK push prompt will be sent to your phone. Enter your M-PESA PIN to complete the payment.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Smartphone className="h-5 w-5" />
                      {loading ? 'Processing...' : 'Pay with M-PESA'}
                    </button>
                  </form>
                )}

                {step === 'processing' && (
                  <div className="text-center py-8">
                    <Loader className="h-16 w-16 text-green-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
                    <p className="text-gray-600">
                      Sending STK push to {phoneNumber}...
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                      Please wait while we initiate the payment
                    </p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">STK Push Sent!</h3>
                    <p className="text-gray-600 mb-4">
                      Please check your phone to complete the payment
                    </p>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>Important:</strong> Enter your M-PESA PIN on the prompt to complete the transaction.
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      This window will close automatically...
                    </p>
                  </div>
                )}

                {/* Footer note */}
                <p className="text-xs text-center text-gray-500 mt-4">
                  Powered by Safaricom M-PESA
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}