import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// create a new react context, used to share authentication-related state and functions across the application
const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  // a state variable session holds the current authentication session.
  const [session, setSession] = useState(undefined);

  // function to signup a new user
  const signUpNewUser = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
    });

    if (error) {
      console.error("Error signing up: ", error);
      return { success: false, error };
    }

    return { success: true, data };
  };

  // function to sign in an existing
  const signInUser = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password,
      });

      if (error) {
        console.error("Sign-in error:", error.message);
        return { success: false, error: error.message };
      }

      console.log("Sign-in success:", data);
      return { success: true, data };
    } catch (error) {
      console.error("Unexpected error during sign-in:", err.message);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };

  // function to sign out a user
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  }

  // runs once when the component mounts and listens for authentication state changes
  // 1. calls supabase.auth.getSession() to retrieve the current session and updates the session state
  // 2. listens for authentication state change, updates session whenever the authentication state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // provides the authentication functions and session state to all child components
  return (
    <AuthContext.Provider
      value={{ signUpNewUser, signInUser, session, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// a custom hook that allows other components to access the authentication context using useContext(AuthContext)
export const UserAuth = () => {
  return useContext(AuthContext);
};
