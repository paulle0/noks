function updateStatus2() {
  console.log("updateStatus2 called.");
  try {
    const loginMasterDataString = localStorage.getItem("liMasterKeypair");
    const loginMasterData = JSON.parse(loginMasterDataString);
    if (loginMasterData) {
      document.getElementById('nsecMasterInput').value = loginMasterData.nsec;
      document.getElementById('relayMasterInput').value = loginMasterData.relay;
      showOk('Logged in. See login data below.');
    } else {
    }
  } catch(e) {}
}

async function loginMasterWithNsec() {
  console.log("loginMasterWithNsec called.");
  const val = document.getElementById('nsecMasterInput').value.trim();
  console.log("Input master nsec: " + val);
  const val2 = document.getElementById('relayMasterInput').value.trim();
  console.log("Input master relay: " + val2);
  try {
    await loginMasterWithNsecBack(val, val2);
  } catch(error) {
    alert(error);
  }
  updateStatus();
  updateStatus2();
  showOk('Successfully logged in. See login data below.');
 }
 
 async function generateRandomNsecDefaultRelay() {
  console.log("generateRandomNsec called.");
  try {
    let skDec = NostrTools.generateSecretKey();
    let skHex = NostrTools.utils.bytesToHex(skDec);
    let sk = NostrTools.nip19.nsecEncode(skDec);
    console.log("created nsec in dec, hex, bech32: ");
    console.log(skDec);
    console.log(skHex);
    console.log(sk);
    let dr = "ws://umbrel.local:4848";
    //let dr = "wss://nos.lol";
    document.getElementById('nsecMasterInput').value = sk;
    document.getElementById('relayMasterInput').value = dr;
    console.log("Succesfully generated random nsec: " + sk);
    console.log("and default relay: " + dr);
  } catch (error) {
    alert(error); return;
  }
}
 
async function loginMasterWithNsecBack(secK, relay) {
  console.log("loginWithMasterNsecBack called.");
  console.log("Input master nsec: " + secK);
  console.log("Input master relay: " + relay);
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
    let liKeyringEvent = await getKeyringEvent(pkHex, [ relay ], skHex);
    let keypair = { pk: pkHex, sk: skHex, npub: pk, npubShort: pkShort, nsec: sk, relay: relay };
    let keypairString = JSON.stringify(keypair);
    localStorage.setItem("liMasterKeypair", keypairString); 
    let liKeyringEventString = JSON.stringify(liKeyringEvent);
    localStorage.setItem("liKeyringEvent", liKeyringEventString);
    console.log("Saved Master keypair: ");
    console.log(keypair);
    console.log(keypairString);
    console.log("Master keypair and relay saved.");
    console.log("Saved masterkey keyring: ");
    console.log(liKeyringEvent);
    console.log(liKeyringEventString);
    console.log("Masterkey keyring event saved.");
    console.log("Successfull master key log in.");
  } catch (error) {
    throw ("Error login masterkey: " + error);
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
