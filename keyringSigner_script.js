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
    const relayMasterData = loginMasterData.relay;
    if (relayMasterData) {
      console.log("relayMasterData found.");
      console.log(relayMasterData);
      rVal.textContent = relayMasterData;
      rVal.classList.add('active');
      rDot.classList.add('on');
    } else {
      console.log("No relayMasterData found.");
      rVal.textContent = 'not selected';
      rVal.classList.remove('active');
      rDot.classList.remove('on');
    }
  } catch(e) {}
}

function updateStatus2() {
  console.log("updateStatus2 called.");
  try {
    const loginMasterDataString = localStorage.getItem("liMasterKeypair");
    const loginMasterData = JSON.parse(loginMasterDataString);
    if (loginMasterData) {
      document.getElementById('nsecMasterInput').value = loginMasterData.nsec;
      document.getElementById('relayMasterInput').value = loginMasterData.relay;
    } else {
    }
  } catch(e) {}
}

function loginMasterWithNsec() {
  console.log("loginMasterWithNsec called.");
  const val = document.getElementById('nsecMasterInput').value.trim();
  console.log("Input master nsec: " + val);
  const val2 = document.getElementById('relayMasterInput').value.trim();
  console.log("Input master relay: " + val2);
  if (!val.startsWith('nsec1')) { alert('Enter a valid nsec1… key'); return; }
  if (!val2.startsWith('wss://') && !val2.startsWith('ws://')) { alert('Enter valid relay'); return; }
  try {
    loginMasterWithNsecBack(val, val2);
  } catch(error) {
    alert(error);
  }
  updateStatus();
  updateStatus2();
  showOk('Logged in.');
 }
 
 function generateRandomNsecDefaultRelay() {
  console.log("generateRandomNsec called.");
  try {
    let skDec = NostrTools.generateSecretKey();
    let skHex = NostrTools.utils.bytesToHex(skDec);
    let sk = NostrTools.nip19.nsecEncode(skDec);
    console.log("created nsec in Dec, hex, bech32: ");
    console.log(skDec);
    console.log(skHex);
    console.log(sk);
    let dr = "ws://umbrel.local/4848";
    //let dr = "wss://nos.lol";
    document.getElementById('nsecMasterInput').value = sk;
    document.getElementById('relayMasterInput').value = dr;
    console.log("Succesfully generated random nsec: " + sk);
    console.log("and default relay: " + dr);
  } catch (error) {
    alert(error); 
  }
}
 
function loginMasterWithNsecBack(secK, deR) {
  console.log("loginWithMasterNsecBack called.");
  console.log("Input master nsec: " + secK);
  console.log("Input master relay: " + deR);
  if (!secK.startsWith('nsec1')) { throw 'Enter a valid nsec1… key'; }
  if (!deR.startsWith('wss://') && !deR.startsWith('ws://')) { throw 'Enter valid relay'; }
  try {
    let sk = secK;
    let skDec = NostrTools.nip19.decode(sk);
    let skHex = NostrTools.utils.bytesToHex(skDec.data);
    console.log("nsec decoded and hex: ");
    console.log(skDec);
    console.log(skHex);
    let pkHex = NostrTools.getPublicKey(skDec.data);
    let pk = NostrTools.nip19.npubEncode(pkHex);
    let pkShort = pk.slice(0,8) + "..." + pk.slice(-8);
    console.log("npub hex, bech32 and short: ");
    console.log(pkHex);
    console.log(pk);
    console.log(pkShort);
    let keypair = { pk: pkHex, sk: skHex, npub: pk, npubShort: pkShort, nsec: sk, relay: deR };
    let keypairString = JSON.stringify(keypair);
    localStorage.setItem("liMasterKeypair", keypairString); 
    console.log("Saved Master keypair: ");
    console.log(keypair);
    console.log(keypairString);
    console.log("Master keypair and relay saved.");
    console.log("Successfull master key and relay log in.");
  } catch (error) {
    throw ("Error login nsec1… masterkey: " + error);
  }
}

function logoutMaster() {
  localStorage.removeItem("liMasterKeypair");
  document.getElementById('nsecMasterInput').value = '';
  document.getElementById('relayMasterInput').value = '';
  document.getElementById('loginOk').classList.remove('show');
  updateStatus();
  updateStatus2();
}
