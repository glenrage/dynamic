import { useCallback } from 'react';
import {
  useDynamicContext,
  useUserUpdateRequest,
} from '@dynamic-labs/sdk-react-core';

export const useUserGameData = () => {
  const { user } = useDynamicContext();
  const { updateUser } = useUserUpdateRequest();

  const persistGameOutcome = useCallback(
    async (isWin) => {
      if (!updateUser || !user) {
        console.warn(
          'useUserGameData: updateUser or user not available for metadata update.'
        );
        return { success: false, error: 'Update function or user not ready' };
      }
      const currentSdkUserMetadata = user.metadata || {};
      let newTotalWins = currentSdkUserMetadata.totalWins || 0;
      let newHasEverSolved =
        currentSdkUserMetadata.hasEverSolvedAMathler || false;

      if (isWin) {
        newTotalWins += 1;
        newHasEverSolved = true;
      }
      const metadataPayload = {
        ...currentSdkUserMetadata,
        hasEverSolvedAMathler: newHasEverSolved,
        totalWins: newTotalWins,
      };
      console.log(
        `useUserGameData: Attempting to update metadata. Win: ${isWin}, UserID: ${user.userId}`
      );
      console.log('useUserGameData: Payload for updateUser:', {
        metadata: metadataPayload,
      });
      try {
        const result = await updateUser({ metadata: metadataPayload });
        console.log(
          'useUserGameData: Metadata update API call SUCCESS. Response:',
          result
        );
        if (result?.updateUserProfileResponse?.user) {
          console.log(
            'Updated user from API response:',
            result.updateUserProfileResponse.user
          );
        }
        return { success: true, data: result };
      } catch (e) {
        console.error('useUserGameData: Error calling updateUser:', e);
        return { success: false, error: e };
      }
    },
    [updateUser, user]
  );

  const clearMathlerMetadataForTesting = useCallback(async () => {
    if (!updateUser || !user) {
      console.warn(
        'useUserGameData: updateUser or user not available to clear metadata.'
      );
      alert(
        'User not ready to clear metadata. Please ensure you are logged in.'
      );
      return { success: false, error: 'Update function or user not ready' };
    }
    const currentSdkUserMetadata = user.metadata || {};
    const clearedMetadataPayload = {
      ...currentSdkUserMetadata,
      hasEverSolvedAMathler: false,
      totalWins: 0,
    };
    console.log('useUserGameData: Attempting to CLEAR Mathler metadata.');
    console.log('useUserGameData: Payload for clearing metadata:', {
      metadata: clearedMetadataPayload,
    });
    try {
      const result = await updateUser({ metadata: clearedMetadataPayload });
      console.log(
        'useUserGameData: Metadata CLEAR API call SUCCESS. Response:',
        result
      );
      alert(
        'Mathler game metadata has been reset. Refresh may be needed to see UI changes.'
      );
      return { success: true, data: result };
    } catch (e) {
      console.error('useUserGameData: Error clearing Mathler metadata:', e);
      alert(`Error clearing metadata: ${e.message}`);
      return { success: false, error: e };
    }
  }, [updateUser, user]);

  return {
    persistGameOutcome,
    clearMathlerMetadataForTesting,
    isDynamicReady: !!(user && updateUser),
  };
};
