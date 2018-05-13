import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/rocketseat');
mongoose.Promise = global.Promise;

export default mongoose;
