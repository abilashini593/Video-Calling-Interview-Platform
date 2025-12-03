import axios from "axios";
console.log("Loaded API URL:", import.meta.env.VITE_API_URL);
const axiosInstance = axios.create({
  baseURL:"http://localhost:3000",
  withCredentials: true, // by adding this field browser will send the cookies to server automatically, on every single req
});

export default axiosInstance;