/* eslint-disable react/prop-types */
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PropTypes from 'prop-types';
import { Fragment, useState } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import CheckoutForm from '../Form/CheckoutForm';
// stripe public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

const PurchaseModal = ({ closeModal, isOpen, plant, refetch }) => {
  const { category, price, name, quantity, seller, _id } = plant || {};
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(price);
  const { user } = useAuth();
  const customer = {
    name: user?.displayName,
    email: user?.email,
    image: user?.photoURL,
  }
  const [purchaseInfo, setPurchaseInfo] = useState({
    customer,
    plantId: _id,
    price: totalPrice,
    quantity: totalQuantity,
    seller: seller?.email,
    address: '',
    status: 'Pending',
  })
  // Total Price Calculation
  const handleQuantity = value => {
    if (value > quantity) {
      setTotalQuantity(quantity);
      return toast.error('Quantity exceeds availale stock!')
    }
    if (value < 0) {
      setTotalQuantity(1);
      return toast.error('Quantity can not be less than 1')
    }
    setTotalQuantity(value);
    setTotalPrice(value * price)
    setPurchaseInfo(prv => {
      return { ...prv, quantity: value, price: value * price }
    })
  }

  /* const handlePurchase = async () => {
    // Save to server side
    try {
      await axiosSecure.post('/order', purchaseInfo);
      await axiosSecure.patch(`/plants/quantity/${_id}`, {
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
      closeModal();
    }
  } */

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as='div' className='relative z-10' onClose={closeModal}>
        <TransitionChild
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black bg-opacity-25' />
        </TransitionChild>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <TransitionChild
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <DialogPanel className='w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all'>
                <DialogTitle
                  as='h3'
                  className='text-lg font-medium text-center leading-6 text-gray-900'
                >
                  Review Info Before Purchase
                </DialogTitle>
                <div className='mt-2'>
                  <p className='text-sm text-gray-500'>Plant: {name}</p>
                </div>
                <div className='mt-2'>
                  <p className='text-sm text-gray-500'>Category: {category}</p>
                </div>
                <div className='mt-2'>
                  <p className='text-sm text-gray-500'>Customer: {user?.displayName}</p>
                </div>

                <div className='mt-2'>
                  <p className='text-sm text-gray-500'>Price: $ {price}</p>
                </div>
                <div className='mt-2'>
                  <p className='text-sm text-gray-500'>Available Quantity: {quantity}</p>
                </div>
                {/* Quantity input field */}
                <div className='space-x-2 text-sm'>
                  <label htmlFor='quantity' className='text-gray-600'>
                    Quantity:
                  </label>
                  <input
                    value={totalQuantity}
                    onChange={e => handleQuantity(parseInt(e.target.value))}
                    className='p-2 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white'
                    name='quantity'
                    id='quantity'
                    type='number'
                    placeholder='Available quantity'
                    required
                  />
                </div>
                {/* Address input field */}
                <div className='space-x-2 text-sm mt-2'>
                  <label htmlFor='quantity' className='text-gray-600'>
                    Address:
                  </label>
                  <input
                    className='p-2 text-gray-800 border border-lime-300 focus:outline-lime-500 rounded-md bg-white'
                    name='address'
                    id='address'
                    onChange={e => setPurchaseInfo(prv => {
                      return { ...prv, address: e.target.value }
                    })}
                    type='text'
                    placeholder='Shpping address here...'
                    required
                  />
                </div>
                {/* Stripe Checkout From */}
                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    closeModal={closeModal}
                    purchaseInfo={purchaseInfo}
                    refetch={refetch}
                    totalQuantity={totalQuantity}
                  ></CheckoutForm>
                </Elements>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
PurchaseModal.propTypes = {
  plant: PropTypes.object.isRequired,
}
export default PurchaseModal
