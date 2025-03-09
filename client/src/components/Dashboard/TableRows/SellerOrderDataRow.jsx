import PropTypes from 'prop-types'
import { useState } from 'react'
import DeleteModal from '../../Modal/DeleteModal'
import toast from 'react-hot-toast'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
const SellerOrderDataRow = ({ orderData, refetch }) => {
  const axiosSecure = useAxiosSecure();
  let [isOpen, setIsOpen] = useState(false)
  const closeModal = () => setIsOpen(false)
  const { name, customer, price, quantity, address, status, _id, plantId } = orderData || {};

  // handle order delete/cancellation
  const handleDelete = async () => {
    try {
      await axiosSecure.delete(`/orders/${_id}`)
      await axiosSecure.patch(`/plants/quantity/${plantId}`, {
        qunatityToUpdate: quantity,
        status: 'increase',
      })
      refetch();
      toast.success('Order Cancelled!')
    }
    catch (err) {
      toast.error(err.response.data)
    }
    finally {
      closeModal();
    }
  }

  // handle status change 
  const handleStatus = async (newStatus) => {
    if (status === newStatus) {
      return
    }
    console.log(newStatus)
    try {
      // update order status
      await axiosSecure.patch(`/orders/${_id}`, {
        qunatityToUpdate: quantity,
        status: newStatus,
      })
      refetch();
      toast.success('Status Updated')
    }
    catch (err) {
      toast.error(err.response.data)
    }
    finally {
      closeModal();
    }
  }
  return (
    <tr>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{name}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{customer?.email}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>${price}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{quantity}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{address}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{status}</p>
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <div className='flex items-center gap-2'>
          <select
            required
            defaultValue={status}
            onChange={(e) => handleStatus(e.target.value)}
            disabled={status === 'Delivered'}
            className='p-1 border-2 border-lime-300 focus:outline-lime-500 rounded-md text-gray-900 whitespace-no-wrap bg-white'
            name='category'
          >
            <option value='Pending'>Pending</option>
            <option value='In Progress'>Start Processing</option>
            <option value='Delivered'>Deliver</option>
          </select>
          <button
            onClick={() => setIsOpen(true)}
            className='relative disabled:cursor-not-allowed cursor-pointer inline-block px-3 py-1 font-semibold text-green-900 leading-tight'
          >
            <span
              aria-hidden='true'
              className='absolute inset-0 bg-red-200 opacity-50 rounded-full'
            ></span>
            <span className='relative'>Cancel</span>
          </button>
        </div>
        <DeleteModal isOpen={isOpen} handleDelete={handleDelete} closeModal={closeModal} />
      </td>
    </tr>
  )
}

SellerOrderDataRow.propTypes = {
  orderData: PropTypes.object,
  refetch: PropTypes.func,
}

export default SellerOrderDataRow
