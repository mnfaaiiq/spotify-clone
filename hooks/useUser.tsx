import { Subscriptions, UserDetails } from "@/types";
import { User } from "@supabase/auth-helpers-nextjs";
import {
  useSessionContext,
  useUser as useSupaUser,
} from "@supabase/auth-helpers-react";
import { createContext, useContext, useEffect, useState } from "react";

type UserContextType = {
  accessToken: string | null;
  user: User | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscriptions | null;
};

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export interface Props {
  children: React.ReactNode; // Specify children prop
}

export const MyUserContextProvider = (props: Props) => {
  const {
    session,
    isLoading: isLoadingSession,
    supabaseClient,
  } = useSessionContext();
  const user = useSupaUser();
  const accessToken = session?.access_token ?? null;
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscriptions | null>(null);

  const getUserDetails = async () => {
    try {
      const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .single();
      if (error) throw error;
      setUserDetails(data as UserDetails);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getSubscription = async () => {
    try {
      const { data, error } = await supabaseClient
        .from("subscriptions")
        .select("*, prices(*, products(*))")
        .in("status", ["trialing", "active"]);
      if (error) throw error;
      setSubscription(data as unknown as Subscriptions);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && !isLoadingData && !userDetails && !subscription) {
      setIsLoadingData(true);

      Promise.allSettled([getUserDetails(), getSubscription()]).then(
        (results) => {
          const userDetailsPromise: any = results[0];
          const subscriptionPromise: any = results[1];

          if (userDetailsPromise.status === "fulfilled") {
            setUserDetails((userDetailsPromise.value as UserDetails) ?? null);
          }

          if (subscriptionPromise.status === "fulfilled") {
            setSubscription(subscriptionPromise.value as Subscriptions);
          }

          setIsLoadingData(false);
        }
      );
    } else if (!user && !isLoadingSession && !isLoadingData) {
      setUserDetails(null);
      setSubscription(null);
    }
  }, [user, isLoadingSession, isLoadingData, subscription, userDetails]);

  const value = {
    accessToken,
    user,
    userDetails,
    isLoading: isLoadingSession || isLoadingData,
    subscription,
  };

  return (
    <UserContext.Provider value={value}>{props.children}</UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a MyUserContextProvider");
  }
  return context;
};
