// =================================================================
// GOOGLE ADMOB REWARDED AD TRIGGER
// =================================================================

export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if Google Ads / GPT SDK is loaded
    if (typeof window !== 'undefined' && (window as any).googletag) {
      const googletag = (window as any).googletag;
      
      googletag.cmd.push(() => {
        const rewardedSlot = googletag.defineOutOfPageSlot(
          '/1895906484640218/8247385555',
          googletag.enums.OutOfPageFormat.REWARDED
        );

        if (rewardedSlot) {
          rewardedSlot.addService(googletag.pubads());
          
          googletag.pubads().addEventListener('rewardedSlotReady', (evt: any) => {
            evt.makeRewardedVisible();
          });

          googletag.pubads().addEventListener('rewardedSlotGranted', () => {
            // User full ad dekhega tabhi signal unlock hoga
            resolve(true);
          });

          googletag.pubads().addEventListener('rewardedSlotClosed', () => {
            googletag.destroySlots([rewardedSlot]);
            resolve(false);
          });

          googletag.enableServices();
          googletag.display(rewardedSlot);
        } else {
          // Fallback agar ad slot ready na ho
          resolve(true);
        }
      });
    } else {
      // Temporary Fallback (Review period tak app issue-free rahegi)
      console.log("Google SDK loading... Instant unlock applied.");
      resolve(true);
    }
  });
};
