import { useCallback, useState } from 'react';
import {
  useDynamicContext,
  useUserUpdateRequest,
} from '@dynamic-labs/sdk-react-core';
import { mintNft } from '../services/api';

export const useUserGameData = () => {
  const { user, primaryWallet } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();
  const [lastNftMint, setLastNftMint] = useState({
    txHash: null,
    tokenId: null,
  });

  const persistGameOutcome = useCallback(
    async (isWin, finalGuessesStrings, finalSolution) => {
      setLastNftMint({ txHash: null, tokenId: null });

      if (!updateUser || !user || !primaryWallet) {
        console.warn('useUserGameData: Dynamic SDK components not ready.');
        return { success: false, error: 'Dynamic SDK components not ready.' };
      }

      const currentSdkUserMetadata = { ...(user.metadata || {}) };
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

      if (isWin && !hasAlreadyReceivedNft) {
        metadataToUpdate.firstWinNftAwardedOrAttempted = true;
      }

      let initialUpdateCallResult;
      try {
        initialUpdateCallResult = await updateUser({
          metadata: metadataToUpdate,
        });

        if (isWin && !hasAlreadyReceivedNft) {
          try {
            const mintResponse = await mintNft(
              primaryWallet.address,
              user.userId
            );

            const mintData = await mintResponse.json();

            if (mintData.success && mintData.transactionHash) {
              setLastNftMint({
                txHash: mintData.transactionHash,
                tokenId: mintData.tokenId || 'N/A',
              });

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
              return {
                success: true,
                data: initialUpdateCallResult,
                nftError: mintData?.message || 'NFT minting failed.',
              };
            }
          } catch (nftError) {
            console.error(
              'useUserGameData: Error calling NFT mint API:',
              nftError
            );
            return {
              success: true,
              data: initialUpdateCallResult,
              nftError: nftError.message || 'Error during NFT mint API call.',
            };
          }
        }
        return { success: true, data: initialUpdateCallResult };
      } catch (e) {
        console.error('useUserGameData: Error on updateUser:', e);
        return { success: false, error: e.message || String(e) };
      }
    },
    [updateUser, user, primaryWallet, setLastNftMint]
  );

  const clearMathlerMetadataForTesting = useCallback(async () => {
    setLastNftMint({ txHash: null, tokenId: null });
    if (!updateUser || !user) {
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
        'Mathler game progress has been reset for testing. Refresh may be needed.'
      );
      return { success: true, data: result };
    } catch (e) {
      console.error('useUserGameData: Error clearing metadata:', e);
      return { success: false, error: e.message || String(e) };
    }
  }, [updateUser, user, setLastNftMint]);

  return {
    persistGameOutcome,
    clearMathlerMetadataForTesting,
    isDynamicReady: !!(user && updateUser && primaryWallet),
    user,
    lastNftMint,
  };
};
