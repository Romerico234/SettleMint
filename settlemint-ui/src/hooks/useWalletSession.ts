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

export function useWalletSession() {
  const [accessToken, setAccessToken] = useState<string | null>(() => getAuthToken());
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const authenticatedWalletAddress = profile?.walletAddress || connectedWalletAddress;
  const walletAddress = authenticatedWalletAddress || connectedWalletAddress;

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      return;
    }

    let mounted = true;

    Promise.all([fetchAuthenticatedUser(), fetchMyProfile()])
      .then(([, profileResult]) => {
        if (mounted) {
          setProfile(profileResult.profile);
          setConnectedWalletAddress(profileResult.profile.walletAddress || null);
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setProfile(null);
          setWalletError(formatErrorMessage(error, "Failed to load account"));
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  async function handleWalletSignIn() {
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

  async function handleSignOut() {
    setAuthLoading(true);
    setWalletError(null);
    clearAuthToken();
    setAccessToken(null);
    setProfile(null);
    setConnectedWalletAddress(null);
    setAuthLoading(false);
  }

  async function handleSaveProfile(input: { displayName: string }) {
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
    walletError,
    walletAddress,
    handleWalletSignIn,
    handleSignOut,
    handleSaveProfile,
  };
}
