import axios from 'axios';

const options = {
  method: 'POST', // Change to POST for code execution
  url: 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', // Correct endpoint for running code
  headers: {
    'Content-Type': 'application/json',
    'x-rapidapi-key': 'e808e9d522msh3194c52268c69d5p16f47fjsn8968e89390af', // Your RapidAPI key
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
  },
  data: {
    language_id: 71, // Example language ID (Python 3)
    source_code: 'print("Hello from Python!")' // Example code
  }
};

try {
  const response = await axios.request(options);
  console.log(response.data);
} catch (error) {
  console.error('Error executing code:', error);
}
