import { Router } from 'express'
import { 
  createVoter, 
  getAllVoters, 
  getVoter, 
  updateVoter, 
} from '../controllers/voter-controllers'


const voter_router = Router();


voter_router.route('/').post(createVoter).get(getAllVoters);
voter_router.route('/:voter_id').get(getVoter).put(updateVoter);



export default voter_router; 