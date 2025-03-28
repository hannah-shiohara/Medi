import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import Logo from "../assets/medi_logo.png";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  const { session, signUpNewUser } = UserAuth();
  const navigate = useNavigate();
  console.log(session);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signUpNewUser(email, password);

      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#EDF0F6] min-h-screen">
      <div className="flex justify-center pt-4">
        <img src={Logo} alt="Medi Logo" className="h-12" />
      </div>
      <form onSubmit={handleSignUp} className="max-w-md m-auto pt-24">
        <h2 className="font-bold pb-2 text-[#555676]">Sign up today!</h2>
        <p>
          Already have an account? <Link to="/signin">Sign in!</Link>
        </p>
        <div className="flex flex-col py-4">
          <input
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="p-3 mt-6"
            type="email"
          />
          <input
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="p-3 mt-6"
            type="password"
          />
          <button type="submit" disabled={loading} className="mt-4 w-full">
            Sign up
          </button>
          {error && <p className="text-red-600 text-center pt-4">{error}</p>}
        </div>
      </form>
    </div>
  );
};

export default Signup;
