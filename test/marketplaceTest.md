1. Test the constructor function with valid arguments to ensure it initializes the contract variables correctly.

2. Test the constructor function with an invalid stableCoin address (0x0) to ensure it reverts with the ZeroAddress error.

3. Test the constructor function with an invalid stakingContract address (0x0) to ensure it reverts with the ZeroAddress error.

4. Test the constructor function with an invalid propertyTokenBytecode (empty bytes) to ensure it reverts with the MissMatch error.

5. Test the constructor function with an invalid identityBytecode (empty bytes) to ensure it reverts with the MissMatch error.

6. Test the constructor function with an invalid IAbytecode (empty bytes) to ensure it reverts with the MissMatch error.

7. Test the constructor function with an invalid IPBytecode (empty bytes) to ensure it reverts with the MissMatch error.

8. Test the setTREXFactory function with a valid factory contract address to ensure it sets the TREXFACTORY variable correctly.

9. Test the setTREXFactory function with an invalid factory contract address (0x0) to ensure it reverts with the ZeroAddress error.

10. Test the setTREXFactory function with a valid factory contract address but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

11. Test the setPrice function with a valid token address, price, and admin caller to ensure it updates the tokenPrice mapping correctly.

12. Test the setPrice function with an invalid token address (0x0) to ensure it reverts with the ZeroAddress error.

13. Test the setPrice function with a valid token address but an invalid price (0) to ensure it reverts with the MustBeGreaterThanZero error.

14. Test the setPrice function with a valid token address and price but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

15. Test the addProperty function with a valid legal token address, totalLegalShares, and tokensPerLegalShares, and admin caller to ensure it adds a new property to the legalToProperty mapping.

16. Test the addProperty function with an invalid legal token address (0x0) to ensure it reverts with the ZeroAddress error.

17. Test the addProperty function with a valid legal token address but an invalid totalLegalShares (0) to ensure it reverts with the MustBeGreaterThanZero error.

18. Test the addProperty function with a valid legal token address and totalLegalShares but an invalid tokensPerLegalShares (0) to ensure it reverts with the MustBeGreaterThanZero error.

19. Test the addProperty function with a valid legal token address, totalLegalShares, and tokensPerLegalShares, but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

20. Test the addProperty function with a valid legal token address, totalLegalShares, and tokensPerLegalShares, but with a legal token that already exists in the legalToProperty mapping to ensure it reverts with the PropertyAlreadyExist error.

21. Test the lockLegalShares function with a valid legal token address, amount, and admin caller to ensure it updates the lockedLegalShares value for the corresponding property in the legalToProperty mapping.

22. Test the lockLegalShares function with an invalid legal token address (0x0) to ensure it reverts with the ZeroAddress error.

23. Test the lockLegalShares function with a valid

24. Test the lockLegalShares function with a valid legal token address but an invalid amount (0) to ensure it reverts with the MustBeGreaterThanZero error.

25. Test the lockLegalShares function with a valid legal token address and amount but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

26. Test the lockLegalShares function with a valid legal token address and amount but with a legal token that does not exist in the legalToProperty mapping to ensure it reverts with the PropertyDoesNotExist error.

27. Test the lockLegalShares function with a valid legal token address, amount, and admin caller, but with an amount that exceeds the totalLegalShares value for the corresponding property in the legalToProperty mapping to ensure it reverts with the ExceedTotalLegalShares error.

28. Test the unlockLegalShares function with a valid legal token address, amount, and admin caller to ensure it updates the lockedLegalShares value for the corresponding property in the legalToProperty mapping.

29. Test the unlockLegalShares function with an invalid legal token address (0x0) to ensure it reverts with the ZeroAddress error.

30. Test the unlockLegalShares function with a valid legal token address but an invalid amount (0) to ensure it reverts with the MustBeGreaterThanZero error.

31. Test the unlockLegalShares function with a valid legal token address and amount but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

32. Test the unlockLegalShares function with a valid legal token address and amount but with a legal token that does not exist in the legalToProperty mapping to ensure it reverts with the PropertyDoesNotExist error.

33. Test the unlockLegalShares function with a valid legal token address, amount, and admin caller, but with an amount that exceeds the lockedLegalShares value for the corresponding property in the legalToProperty mapping to ensure it reverts with the MustBeGreaterThenAmount error.

34. Test the addIdentity function with a valid identity contract address and admin caller to ensure it adds the identity to the legalToIdentity mapping and increments the identityCount variable.

35. Test the addIdentity function with an invalid identity contract address (0x0) to ensure it reverts with the ZeroAddress error.

36. Test the addIdentity function with a valid identity contract address but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

37. Test the createLegalToken function with valid arguments and an admin caller to ensure it creates a new legal token contract and adds it to the legalToProperty mapping.

38. Test the createLegalToken function with an invalid salt (empty bytes) to ensure it reverts with the MissMatch error.

39. Test the createLegalToken function with a valid salt but an invalid property contract address (0x0) to ensure it reverts with the ZeroAddress error.

40. Test the createLegalToken function with a valid salt and property contract address but an invalid tokensPerLegalShares (0) to ensure it reverts with the MustBeGreaterThanZero error.

41. Test the createLegalToken function with a valid salt, property contract address, and tokensPerLegalShares but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

42. Test the createLegalToken function with a valid salt, property contract address, and tokensPerLegalShares, but with a salt that has already been used to create a legal token to

43. Test the createLegalToken function with a valid salt, property contract address, and tokensPerLegalShares, but with a totalLegalShares value for the corresponding property in the legalToProperty mapping that is less than the tokensPerLegalShares value to ensure it reverts with the totalMustBeGreaterThanToLock error.

44. Test the createWLegalToken function with valid arguments and an admin caller to ensure it creates a new WLegal token contract and adds it to the legalToProperty mapping.

45. Test the createWLegalToken function with an invalid salt (empty bytes) to ensure it reverts with the MissMatch error.

46. Test the createWLegalToken function with a valid salt but an invalid property contract address (0x0) to ensure it reverts with the ZeroAddress error.

47. Test the createWLegalToken function with a valid salt and property contract address but an invalid tokensPerLegalShares (0) to ensure it reverts with the MustBeGreaterThanZero error.

48. Test the createWLegalToken function with a valid salt, property contract address, and tokensPerLegalShares but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

49. Test the createWLegalToken function with a valid salt, property contract address, and tokensPerLegalShares, but with a salt that has already been used to create a WLegal token to ensure it reverts with the PropertyAlreadyExist error.

50. Test the createWLegalToken function with a valid salt, property contract address, and tokensPerLegalShares, but with a totalLegalShares value for the corresponding property in the legalToProperty mapping that is less than the tokensPerLegalShares value to ensure it reverts with the totalMustBeGreaterThanToLock error.

51. Test the createPropertyToken function with valid arguments and an admin caller to ensure it creates a new property token contract and adds it to the tokenExisits mapping.

52. Test the createPropertyToken function with an invalid salt (empty bytes) to ensure it reverts with the MissMatch error.

53. Test the createPropertyToken function with a valid salt but an invalid legal token address (0x0) to ensure it reverts with the ZeroAddress error.

54. Test the createPropertyToken function with a valid salt and legal token address but an invalid price (0) to ensure it reverts with the MustBeGreaterThanZero error.

55. Test the createPropertyToken function with a valid salt, legal token address, and price but with a non-admin caller to ensure it reverts with the OnlyAdminRole error.

56. Test the createPropertyToken function with a valid salt, legal token address, and price, but with a salt that has already been used to create a property token to ensure it reverts with the PropertyAlreadyExist error.

57. Test the createPropertyToken function with a valid salt, legal token address, and price, but with a legal token that does not exist in the legalToProperty mapping to ensure it reverts with the PropertyDoesNotExist error.

58. Test the createERC3643 function with valid arguments and an admin caller to ensure it creates a new ERC3643 contract and emits the newERC3643 event.

59. Test the createERC3643 function with an invalid salt (empty bytes) to ensure it reverts with the MissMatch error.

60. Test the createERC3643 function with a valid salt but an invalid property contract address (0x0) to ensure it re







