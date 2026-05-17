function updateStatus() {
  console.log("updateStatus called.");
  try {
    const loginMasterDataString = localStorage.getItem("liMasterKeypair");
    const loginMasterData = JSON.parse(loginMasterDataString);
    const mVal = document.getElementById('masterVal');
    const mDot = document.getElementById('masterDot');
    if (loginMasterData) {
      console.log("loginMasterData found.");
      mVal.textContent = loginMasterData.npubShort;
      mVal.classList.add('active');
      mDot.classList.add('on');
    } else {
      console.log("No loginMasterData found.");
      mVal.textContent = 'not logged in';
      mVal.classList.remove('active');
      mDot.classList.remove('on');
    }
    const rVal = document.getElementById('relayVal');
    const rDot = document.getElementById('relayDot');
    if (loginMasterData) {
      console.log("loginMasterData found.");
      rVal.textContent = loginMasterData.relay;
      rVal.classList.add('active');
      rDot.classList.add('on');
    } else {
      console.log("No loginMasterData found.");
      rVal.textContent = 'not selected';
      rVal.classList.remove('active');
      rDot.classList.remove('on');
    }
  } catch(e) {}
}
