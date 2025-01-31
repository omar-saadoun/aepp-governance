import Aepp from '@aeternity/aepp-sdk/es/ae/aepp';
import Util from './util';
import registryContractSource from '../../../governance-contracts/contracts/Registry.aes';
import {Universal} from "@aeternity/aepp-sdk/es/ae/universal";

const aeternity = {
  client: null,
  address: null,
  height: null,
  networkId: null,
  passive: false,
  nodeURL: 'https://nodo.inmind.space', // THIS IS FOR THE STATIC CLIENT WITHOUT WALLET
  compilerURL: 'https://compiler.inmind.space', // THIS IS FOR THE STATIC CLIENT WITHOUT WALLET
  contractAddress: 'ct_27iweB4GCJvuuLXJxWFjq3CjnE2C1j4hsd5SGE8ZR1v6sd9Rd9'
};

const timeout = async (promise) => {
  return Promise.race([
    promise,
    new Promise(resolve =>
      setTimeout(() => {
        resolve('TIMEOUT');
      }, 30000))
  ]);
};

aeternity.initProvider = async () => {
  try {
    try {
      aeternity.address = await aeternity.client.address();
      aeternity.balance = await aeternity.client.balance(aeternity.address)
        .then(balance => `${Util.atomsToAe(balance)}`.replace(',', ''))
        .catch(() => '0');
    } catch (e) {
      aeternity.passive = true;
    }
    console.warn('gets there1');
    aeternity.height = await aeternity.client.height();
    aeternity.networkId = (await aeternity.client.getNodeInfo()).nodeNetworkId;
    aeternity.contract = await aeternity.client.getContractInstance(registryContractSource, {contractAddress: aeternity.contractAddress});
    console.warn('gets there2');
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

aeternity.initMobileBaseAepp = async () => {
  try {
    if (window.parent === window) return false;
    return await timeout(Aepp());
  } catch (e) {
    console.warn('Base Aepp init failed');
    return false;
  }
};

aeternity.getWalletWindow = async () => {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://base.aepps.com/'; //'https://base.aepps.com/' // https://stage-identity.aepps.com/ http://localhost:8080/
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  await new Promise(resolve => {
    const handler = ({data}) => {
      if (data.method !== 'ready') return;
      window.removeEventListener('message', handler);
      resolve();
    };
    window.addEventListener('message', handler);
  });
  return iframe.contentWindow;
};

aeternity.initReverseIframe = async () => {
  try {
    return await timeout(Aepp({
      parent: await aeternity.getWalletWindow()
    }));
  } catch (e) {
    console.warn('Reverse iFrame init failed');
    return false;
  }
};

aeternity.initStaticClient = async () => {
  return Universal({
    url: aeternity.nodeURL,
    internalUrl: aeternity.nodeURL,
    compilerUrl: aeternity.compilerURL
  });
};

aeternity.checkAvailableWallets = async () => {

  // Check for base aepp
  const wallets = {};

  const baseAeppClient = await aeternity.initMobileBaseAepp();
  if (baseAeppClient && baseAeppClient !== 'TIMEOUT') wallets['MobileBaseAepp'] = baseAeppClient;

  // Dont even check for iframe / extension if aepp is run inside a base-aepp
  if (baseAeppClient && window.parent !== window) return wallets;

  /*
  // Check for iframe
  const iframeClient = await aeternity.initReverseIframe();
  if (iframeClient && iframeClient !== 'TIMEOUT') wallets['ReverseIframe'] = iframeClient;
  */


  // Make static wallet available
  const staticClient = await aeternity.initStaticClient();
  if (staticClient) wallets['StaticClient'] = staticClient;

  // Check for window.Aepp
  if (window.hasOwnProperty('Aepp')) {
    // TODO maybe implement extension
  }

  return wallets;
};

aeternity.setClient = async (clientName, client) => {
  aeternity.client = client;
  sessionStorage.setItem('aeWallet', clientName);
  return await aeternity.initProvider();
};

aeternity.hasActiveWallet = () => {
  return !!aeternity.client && !!aeternity.contract;
};

aeternity.isTestnet = () => {
  return aeternity.networkId !== 'ae_mainnet';
};

aeternity.initClient = async () => {
  let result = true;
  if (!aeternity.client) {
    try {
      const preferredWallet = sessionStorage.getItem('aeWallet');
      if(preferredWallet === 'StaticClient' && window.parent !== window) {
        // Retry base-aepp
        sessionStorage.removeItem('aeWallet');
      } else if (preferredWallet) {
        try {
          let client = await aeternity['init' + preferredWallet]();
          result = await aeternity.setClient(preferredWallet, client);
          if (!result) sessionStorage.removeItem('aeWallet');
          else return result;
        } catch (e) {
          console.error(e);
          sessionStorage.removeItem('aeWallet');
        }
      }
      // If preferred wallet check fails, try the other wallets
      const wallets = await aeternity.checkAvailableWallets();
      if (Object.keys(wallets).length === 1) {
        result = await aeternity.setClient(Object.keys(wallets)[0], wallets[Object.keys(wallets)[0]]);
      } else if (Object.keys(wallets).length > 1) {
        const otherWallets = Object.filter(wallets).map(walletName => walletName !== preferredWallet);
        result = await aeternity.setClient(otherWallets[0], wallets[otherWallets[0]]);
      } else {
        result = false;
      }

    } catch (e) {
      console.error(e);
      result = false;
    }
  } else {
    result = await aeternity.initProvider();
  }
  return result;
};

aeternity.verifyAddress = async () => {
  const currAddress = await aeternity.client.address();
  return currAddress !== aeternity.address;
};

aeternity.disableWallet = async () => {
  const staticClient = await aeternity.initStaticClient();
  await aeternity.setClient('StaticClient', staticClient);
};

aeternity.delegation = async (address) => {
  return (await aeternity.contract.methods.delegatee(address)).decodedResult;
};

aeternity.delegations = async (address) => {
  const delegationsResult = await aeternity.contract.methods.delegators(address);
  return Promise.all(delegationsResult.decodedResult.map(async ([delegator, delegatee]) => {
    const delegateeDelegations = (await aeternity.contract.methods.delegators(delegator)).decodedResult;
    return {
      delegator: delegator,
      delegatee: delegatee,
      delegatorAmount: await aeternity.client.balance(delegator),
      includesIndirectDelegations: delegateeDelegations.length !== 0
    };
  }));
};

aeternity.polls = async () => {
  const height = await aeternity.client.height();
  const polls = await aeternity.contract.methods.polls();
  return polls.decodedResult;
};

export default aeternity;
