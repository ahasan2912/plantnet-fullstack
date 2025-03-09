import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { imageUpload } from '../../../api/utils';
import AddPlantForm from '../../../components/Form/AddPlantForm';
import useAuth from '../../../hooks/useAuth';
import useAxiosSecure from '../../../hooks/useAxiosSecure';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


const AddPlant = () => {
  const { user } = useAuth();
  const [uploadBtnImg, setUploadBtnImg] = useState({image:{name: 'Upload Button'}});
  const [loading, setLoading] = useState(false);
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  //handle form submit 
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    const name = form.name.value;
    const description = form.description.value;
    const category = form.category.value;
    const price = parseFloat(form.price.value);
    const quantity = parseInt(form.quantity.value);
    const image = form.image.files[0];
    const imageUrl = await imageUpload(image)

    // seller info
    const seller = {
      name: user?.displayName,
      image: user?.photoURL,
      email: user?.email
    }
    // create plant data object
    const palntData = {
      name, category, description, price, quantity, image: imageUrl, seller
    }

    // save plant in db
    try{
      //post
      await axiosSecure.post('/plants', palntData)
      toast.success("Data Added Successfully");
      navigate('/dashboard/my-inventory')
    }
    catch(err){
      console.log(err);
    }
    finally{
      setLoading(false);
    }
  }

  return (
    <div>
      <Helmet>
        <title>Add Plant | Dashboard</title>
      </Helmet>

      {/* Form */}
      <AddPlantForm
        handleSubmit={handleSubmit}
        uploadBtnImg={uploadBtnImg}
        setUploadBtnImg={setUploadBtnImg}
        loading={loading}
      />
    </div>
  )
}

export default AddPlant
