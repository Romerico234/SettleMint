import { useEffect, useState } from "react";
import {
  createAuthChallenge,
  fetchAuthenticatedUser,
  verifyWalletSignature,
} from "../api/auth";
import { fetchMyProfile, updateMyProfile } from "../api/users";
import type { UserProfile } from "../api/users";
import { clearAuthToken, getAuthToken, setAuthToken } from "../lib/auth";
import { formatErrorMessage } from "../lib/appHelpers";
import {
  getExistingConnectedEthereumWallet,
  getWalletChainId,
  requestWalletAccess,
  signMessage,
} from "../lib/wallet";

export function useAccountSession() {
  const [accessToken, setAccessToken] = useState<string | null>(() => getAuthToken());
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const authenticatedWalletAddress = profile?.walletAddress || connectedWalletAddress;
  const walletAddress = authenticatedWalletAddress || connectedWalletAddress;

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      setSessionReady(true);
      return;
    }

    let mounted = true;
    setSessionReady(false);

    Promise.all([fetchAuthenticatedUser(), fetchMyProfile()])
      .then(([, profileResult]) => {
        if (!mounted) {
          return;
        }

        setProfile(profileResult.profile);
        setConnectedWalletAddress(profileResult.profile.walletAddress || null);
        setSessionReady(true);
      })
      .catch((error: Error) => {
        if (!mounted) {
          return;
        }

        clearAuthToken();
        setAccessToken(null);
        setProfile(null);
        setWalletError(formatErrorMessage(error, "Failed to load account"));
        setSessionReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  async function signIn() {
    if (accessToken && authenticatedWalletAddress) {
      return;
    }

    setAuthLoading(true);
    setWalletError(null);

    try {
      const wallet = (await getExistingConnectedEthereumWallet()) || (await requestWalletAccess());

      if (!wallet) {
        setWalletError("MetaMask or another Ethereum wallet was not detected in this browser.");
        return;
      }

      setConnectedWalletAddress(wallet.address);

      const chainId = await getWalletChainId(wallet);
      const challenge = await createAuthChallenge({
        walletAddress: wallet.address,
        domain: window.location.host,
        uri: window.location.origin,
        chainId,
      });
      const signature = await signMessage(wallet, wallet.address, challenge.message);
      const result = await verifyWalletSignature({
        walletAddress: wallet.address,
        message: challenge.message,
        signature,
      });

      setAuthToken(result.token);
      setAccessToken(result.token);
      setWalletError(null);
    } catch (error) {
      setWalletError(formatErrorMessage(error, "Failed to sign in with wallet"));
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    setAuthLoading(true);
    setWalletError(null);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    clearAuthToken();
    setAccessToken(null);
    setProfile(null);
    setConnectedWalletAddress(null);
    setSessionReady(true);
    setAuthLoading(false);
  }

  async function saveProfile(input: { displayName: string }) {
    setProfileSaving(true);
    setWalletError(null);

    try {
      const result = await updateMyProfile(input);
      setProfile(result.profile);
    } catch (error) {
      setWalletError(formatErrorMessage(error, "Failed to save profile"));
    } finally {
      setProfileSaving(false);
    }
  }

  return {
    accessToken,
    connectedWalletAddress,
    profile,
    profileSaving,
    authLoading,
    sessionReady,
    walletError,
    walletAddress,
    signIn,
    signOut,
    saveProfile,
  };
}
