/* eslint-disable react-hooks/exhaustive-deps */

import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import Button from '../Shared/Button/Button';
import './CheckoutForm.css';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


const CheckoutForm = ({ closeModal, purchaseInfo, totalQuantity, refetch }) => {
    const [clientSecret, setClientSecret] = useState();
    const axiosSecure = useAxiosSecure();
    const navigate = useNavigate();
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        getPaymentIntent();
    }, [purchaseInfo])

    const getPaymentIntent = async () => {
        try {
            const { data } = await axiosSecure.post('/create-payment-intent', {
                quantity: purchaseInfo?.quantity,
                plantId: purchaseInfo?.plantId
            })
            setClientSecret(data.clientSecret);
        }
        catch (error) {
            console.log(error);
        }
    }
    // console.log(clientSecret)

    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (event) => {
        setProcessing(true);
        // Block native form submission.
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        const card = elements.getElement(CardElement);

        if (card == null) {
            setProcessing(false)
            return;
        }

        // Use your card Element with other Stripe.js APIs
        const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card,
        });

        if (error) {
            setProcessing(false);
            return console.log('[error]', error);
        } else {
            console.log('[PaymentMethod]', paymentMethod);
        }

        // confirm payment
        const { paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: card,
                billing_details: {
                    name: purchaseInfo?.customer?.name,
                    email: purchaseInfo?.customer?.email
                },
            },
        })
        if (paymentIntent.status === 'succeeded') {
            try {
                await axiosSecure.post('/order', { ...purchaseInfo, transactionId: paymentIntent?.id });
                await axiosSecure.patch(`/plants/quantity/${purchaseInfo?.plantId}`, {
                    qunatityToUpdate: totalQuantity,
                    status: 'decrease',
                })
                toast.success('Order Successful!');
                refetch();
                navigate('/dashboard/my-orders')
            }
            catch (err) {
                console.log(err)
            }
            finally {
                setProcessing(false)
                closeModal();
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <CardElement
                options={{
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                                color: '#aab7c4',
                            },
                        },
                        invalid: {
                            color: '#9e2146',
                        },
                    },
                }}
            />
            <div className='flex justify-between gap-3'>
                <Button type="submit"
                    label={`Pay ${purchaseInfo?.price}$`}
                    disabled={!stripe || !clientSecret || processing}
                ></Button>
                <Button onClick={closeModal} label={'Cancel'}></Button>
            </div>
        </form>
    );
};
CheckoutForm.propTypes = {
    purchaseInfo: PropTypes.object,
    closeModal: PropTypes.func,
    refetch: PropTypes.func,
    totalQuantity: PropTypes.number,
}
export default CheckoutForm;