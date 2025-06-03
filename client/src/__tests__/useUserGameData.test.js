import { renderHook, act } from '@testing-library/react';
import { useUserGameData } from '../hooks/useUserGameData';

// Mocking Dynamic SDK Hooks
jest.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: jest.fn(),
  useUserUpdateRequest: jest.fn(),
}));

// Mocking fetch for the NFT mint API call
global.fetch = jest.fn();

describe('useUserGameData', () => {
  let mockUser;
  let mockPrimaryWallet;
  let mockUpdateUserFn;
  let alertSpy; // For mocking window.alert

  // Mocks for Dynamic SDK hooks to allow per-test configuration
  let useDynamicContextMock =
    require('@dynamic-labs/sdk-react-core').useDynamicContext;
  let useUserUpdateRequestMock =
    require('@dynamic-labs/sdk-react-core').useUserUpdateRequest;

  beforeEach(() => {
    // Reset mocks before each test
    mockUser = {
      userId: 'test-user-123',
      metadata: {}, // Start with empty metadata
    };
    mockPrimaryWallet = {
      address: '0xUserWalletAddressForNFT',
      chainId: 84532,
    };
    mockUpdateUserFn = jest.fn(async (payload) => {
      // Simulate updateUser success and update the mockUser's metadata
      // This helps test logic that reads metadata after an update.
      if (payload.metadata) {
        // Ensure we're updating the *mockUser* object that the hook's 'user' variable will point to
        mockUser.metadata = { ...mockUser.metadata, ...payload.metadata };
      }
      return {
        success: true,
        updateUserProfileResponse: { user: { ...mockUser } }, // Return updated mock user
      };
    });

    // Configure the mock implementations for Dynamic hooks
    useDynamicContextMock.mockReturnValue({
      user: mockUser,
      primaryWallet: mockPrimaryWallet,
    });
    useUserUpdateRequestMock.mockReturnValue({
      updateUser: mockUpdateUserFn,
    });

    global.fetch.mockClear();
    // Default successful fetch mock for NFT mint
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'NFT Minted!',
        transactionHash: '0xTestTxHash',
        tokenId: '123',
      }),
    });

    // Mock window.alert globally for this describe block
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original window.alert
    if (alertSpy) {
      alertSpy.mockRestore();
    }
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it('should correctly initialize isDynamicReady', () => {
    const { result } = renderHook(() => useUserGameData());
    expect(result.current.isDynamicReady).toBe(true);

    // Test when user is not ready
    useDynamicContextMock.mockReturnValue({
      user: null,
      primaryWallet: mockPrimaryWallet,
    });
    // updateUser might still be available if useUserUpdateRequest doesn't depend on user
    useUserUpdateRequestMock.mockReturnValue({
      updateUser: mockUpdateUserFn,
    });
    const { result: resultNotReadyUser } = renderHook(() => useUserGameData());
    expect(resultNotReadyUser.current.isDynamicReady).toBe(false);

    // Test when primaryWallet is not ready
    useDynamicContextMock.mockReturnValue({
      user: mockUser,
      primaryWallet: null,
    });
    const { result: resultNotReadyWallet } = renderHook(() =>
      useUserGameData()
    );
    expect(resultNotReadyWallet.current.isDynamicReady).toBe(false);

    // Test when updateUser is not ready
    useDynamicContextMock.mockReturnValue({
      user: mockUser,
      primaryWallet: mockPrimaryWallet,
    });
    useUserUpdateRequestMock.mockReturnValue({
      updateUser: undefined, // Simulate updateUser not being available
    });
    const { result: resultNotReadyUpdateUser } = renderHook(() =>
      useUserGameData()
    );
    expect(resultNotReadyUpdateUser.current.isDynamicReady).toBe(false);
  });

  describe('persistGameOutcome', () => {
    it('should update metadata correctly for a win (when NOT first ever win)', async () => {
      mockUser.metadata = {
        hasEverSolvedAMathler: true,
        totalWins: 1,
        firstWinNftAwardedOrAttempted: true,
        hasReceivedFirstWinNft: true,
      }; // Simulate already solved & received NFT
      useDynamicContextMock.mockReturnValue({
        // Re-apply mock with updated user metadata
        user: mockUser,
        primaryWallet: mockPrimaryWallet,
      });
      useUserUpdateRequestMock.mockReturnValue({
        updateUser: mockUpdateUserFn,
      });

      const { result } = renderHook(() => useUserGameData());

      await act(async () => {
        await result.current.persistGameOutcome(true, ['2+2=4'], '2+2=4');
      });

      expect(mockUpdateUserFn).toHaveBeenCalledTimes(1);
      const firstCallArgs = mockUpdateUserFn.mock.calls[0][0];
      expect(firstCallArgs.metadata.hasEverSolvedAMathler).toBe(true);
      expect(firstCallArgs.metadata.totalWins).toBe(2); // Incremented
      expect(firstCallArgs.metadata.mathlerHistory).toHaveProperty(
        new Date().toISOString().slice(0, 10)
      );
      // Ensure NFT flags are untouched
      expect(firstCallArgs.metadata.firstWinNftAwardedOrAttempted).toBe(true);
      expect(firstCallArgs.metadata.hasReceivedFirstWinNft).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should update metadata, trigger NFT mint on first ever win, and update metadata again for NFT receipt', async () => {
      mockUser.metadata = {}; // Ensure user starts with no solve history
      useDynamicContextMock.mockReturnValue({
        user: mockUser,
        primaryWallet: mockPrimaryWallet,
      });
      useUserUpdateRequestMock.mockReturnValue({
        updateUser: mockUpdateUserFn,
      });

      const { result } = renderHook(() => useUserGameData());

      await act(async () => {
        await result.current.persistGameOutcome(true, ['1+1=2'], '1+1=2');
      });

      // First call to updateUser for game outcome and attempting NFT
      expect(mockUpdateUserFn).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          metadata: expect.objectContaining({
            hasEverSolvedAMathler: true,
            totalWins: 1,
            firstWinNftAwardedOrAttempted: true, // This flag is set by the first update
          }),
        })
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.JEST_MOCK_API_URL}/feature/mint-first-win-nft`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userWalletAddress: mockPrimaryWallet.address,
            userId: mockUser.userId,
          }),
        })
      );
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Congratulations! Your First Win NFT')
      );

      // Second call to updateUser to set hasReceivedFirstWinNft
      expect(mockUpdateUserFn).toHaveBeenCalledTimes(2); // Total calls
      expect(mockUpdateUserFn).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            hasEverSolvedAMathler: true, // Preserved from first update logic
            totalWins: 1, // Preserved from first update logic
            firstWinNftAwardedOrAttempted: true, // Preserved from first update logic
            hasReceivedFirstWinNft: true, // Newly added by second update
          }),
        })
      );
    });

    it('should not trigger NFT mint if not a win', async () => {
      const { result } = renderHook(() => useUserGameData());
      await act(async () => {
        await result.current.persistGameOutcome(false, ['1+1=3'], '1+1=2');
      });
      expect(mockUpdateUserFn).toHaveBeenCalledTimes(1);
      const callArgs = mockUpdateUserFn.mock.calls[0][0];
      expect(callArgs.metadata.hasEverSolvedAMathler).toBe(false);
      expect(callArgs.metadata.totalWins).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('clearMathlerMetadataForTesting', () => {
    it('should clear game-specific metadata but preserve NFT flags and other metadata', async () => {
      mockUser.metadata = {
        hasEverSolvedAMathler: true,
        totalWins: 5,
        mathlerHistory: { '2023-01-01': { status: 'won' } },
        firstWinNftAwardedOrAttempted: true, // NFT flag to preserve
        hasReceivedFirstWinNft: true, // NFT flag to preserve
        anotherCustomField: 'preserve_me', // Other metadata to preserve
      };
      useDynamicContextMock.mockReturnValue({
        // Re-apply mock
        user: mockUser,
        primaryWallet: mockPrimaryWallet,
      });
      useUserUpdateRequestMock.mockReturnValue({
        updateUser: mockUpdateUserFn,
      });

      const { result } = renderHook(() => useUserGameData());

      await act(async () => {
        await result.current.clearMathlerMetadataForTesting();
      });

      expect(mockUpdateUserFn).toHaveBeenCalledTimes(1);
      const clearedMetadataPayload = mockUpdateUserFn.mock.calls[0][0].metadata;

      // Check that game-specific fields are reset
      expect(clearedMetadataPayload.hasEverSolvedAMathler).toBe(false);
      expect(clearedMetadataPayload.totalWins).toBe(0);
      expect(clearedMetadataPayload.mathlerHistory).toEqual({});

      // Check that NFT-related flags (and other custom fields) are PRESERVED
      expect(clearedMetadataPayload.firstWinNftAwardedOrAttempted).toBe(true);
      expect(clearedMetadataPayload.hasReceivedFirstWinNft).toBe(true);
      expect(clearedMetadataPayload.anotherCustomField).toBe('preserve_me');

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Mathler game-specific metadata has been reset for testing. NFT flags preserved. Refresh may be needed'
        )
      );
    });
  });
});
