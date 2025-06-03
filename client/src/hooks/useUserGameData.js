import { useCallback } from 'react';
import {
  useDynamicContext,
  useUserUpdateRequest,
} from '@dynamic-labs/sdk-react-core';
import { getApiBaseUrl } from '../services/api';

const API_BASE_URL = getApiBaseUrl();

export const useUserGameData = () => {
  const { user, primaryWallet } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();

  const persistGameOutcome = useCallback(
    async (isWin, finalGuessesStrings, finalSolution) => {
      if (!updateUser || !user || !primaryWallet) {
        console.warn('useUserGameData: Dynamic SDK components not ready.');
        return { success: false, error: 'Dynamic SDK components not ready.' };
      }

      const currentSdkUserMetadata = { ...(user.metadata || {}) };
      // check if NFT has *already been received*.
      const hasAlreadyReceivedNft =
        currentSdkUserMetadata.hasReceivedFirstWinNft || false;

      const todayDateString = new Date().toISOString().slice(0, 10);
      let newTotalWins = currentSdkUserMetadata.totalWins || 0;
      if (isWin) {
        newTotalWins += 1;
      }

      const todayHistoryEntry = {
        guesses: finalGuessesStrings,
        status: isWin ? 'won' : 'lost',
        ...(isWin && { solution: finalSolution }),
      };

      let metadataToUpdate = {
        ...currentSdkUserMetadata,
        hasEverSolvedAMathler:
          currentSdkUserMetadata.hasEverSolvedAMathler || isWin,
        totalWins: newTotalWins,
        mathlerHistory: {
          ...(currentSdkUserMetadata.mathlerHistory || {}),
          [todayDateString]: todayHistoryEntry,
        },
      };

      // Set attempt flag only if they win AND have never received the NFT before.
      if (isWin && !hasAlreadyReceivedNft) {
        metadataToUpdate.firstWinNftAwardedOrAttempted = true;
      }

      let initialUpdateCallResult;
      try {
        initialUpdateCallResult = await updateUser({
          metadata: metadataToUpdate,
        });

        // Trigger NFT Mint only if it's a win AND they haven't received the NFT before.
        if (isWin && !hasAlreadyReceivedNft) {
          try {
            const mintResponse = await fetch(
              `${API_BASE_URL}/feature/mint-first-win-nft`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userWalletAddress: primaryWallet.address,
                  userId: user.userId,
                }),
              }
            );
            const mintData = await mintResponse.json();

            if (
              mintResponse.ok &&
              mintData.success &&
              mintData.transactionHash
            ) {
              const txHash = mintData.transactionHash;
              alert(
                `🏆 Congratulations! Your First Win NFT (Token ID: ${mintData.tokenId}) is minting!` +
                  `\nTransaction Hash: ${txHash}`
              );

              const finalMetadataAfterNft = {
                ...metadataToUpdate,
                hasReceivedFirstWinNft: true,
              };
              try {
                await updateUser({ metadata: finalMetadataAfterNft });
              } catch (receiptUpdateError) {
                console.error(
                  'useUserGameData: Error updating metadata with NFT receipt:',
                  receiptUpdateError
                );
              }
            } else {
              console.error(
                'useUserGameData: NFT Mint API call failed:',
                mintData?.message || 'Unknown error.'
              );
              alert(
                `Congrats on your win! Issue minting NFT: ${mintData?.message}`
              );
            }
          } catch (nftError) {
            console.error(
              'useUserGameData: Error calling NFT mint API:',
              nftError
            );
            alert(
              `Congrats on your win! Issue minting NFT: ${nftError.message}`
            );
          }
        } else if (isWin && hasAlreadyReceivedNft) {
          alert(`🎉 Congratulations on another win!`);
        }
        return { success: true, data: initialUpdateCallResult };
      } catch (e) {
        console.error('useUserGameData: Error on updateUser:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
    [updateUser, user, primaryWallet]
  );

  const clearMathlerMetadataForTesting = useCallback(async () => {
    if (!updateUser || !user) {
      alert('User not ready to clear metadata.');
      return { success: false, error: 'User not ready.' };
    }
    const currentSdkUserMetadata = user.metadata || {};

    const clearedMetadataPayload = {
      ...currentSdkUserMetadata,
      hasEverSolvedAMathler: false,
      totalWins: 0,
      mathlerHistory: {},
    };

    try {
      const result = await updateUser({ metadata: clearedMetadataPayload });
      alert(
        'Mathler game progress reset. NFT achievement data preserved. Refresh if needed.'
      );
      return { success: true, data: result };
    } catch (e) {
      console.error('useUserGameData: Error clearing metadata:', e);
      alert(`Error clearing metadata: ${e.message}`);
      return { success: false, error: e.message || String(e) };
    }
  }, [updateUser, user]);

  return {
    persistGameOutcome,
    clearMathlerMetadataForTesting,
    isDynamicReady: !!(user && updateUser && primaryWallet),
    user,
  };
};
