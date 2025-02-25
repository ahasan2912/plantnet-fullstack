import PropTypes from 'prop-types'
import { useState } from 'react'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import DeleteModal from '../../Modal/DeleteModal'
import toast from 'react-hot-toast'
const CustomerOrderDataRow = ({ orderData, refetch }) => {
  let [isOpen, setIsOpen] = useState(false)
  const closeModal = () => setIsOpen(false)
  const { name, image, category, price, quantity, status, _id, plantId } = orderData || {};
  const axiosSecure = useAxiosSecure();
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
  return (
    <tr>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <div className='flex items-center'>
          <div className='flex-shrink-0'>
            <div className='block relative'>
              <img
                alt='profile'
                src={image}
                className='mx-auto object-cover rounded h-10 w-15 '
              />
            </div>
          </div>
        </div>
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{name}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{category}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>${price}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{quantity}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{status}</p>
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <button
          onClick={() => setIsOpen(true)}
          className='relative disabled:cursor-not-allowed cursor-pointer inline-block px-3 py-1 font-semibold text-lime-900 leading-tight'
        >
          <span className='absolute cursor-pointer inset-0 bg-red-200 opacity-50 rounded-full'></span>
          <span className='relative cursor-pointer'>Cancel</span>
        </button>

        <DeleteModal handleDelete={handleDelete} isOpen={isOpen} closeModal={closeModal} />
      </td>
    </tr>
  )
}

CustomerOrderDataRow.propTypes = {
  orderData: PropTypes.object,
  refetch: PropTypes.func,
}

export default CustomerOrderDataRow

