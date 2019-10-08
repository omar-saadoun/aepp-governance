import { RpcAepp } from '@aeternity/aepp-sdk/es'
import Detector from '@aeternity/aepp-sdk/es/utils/aepp-wallet-communication/wallet-detector'
import BrowserWindowMessageConnection from '@aeternity/aepp-sdk/es/utils/aepp-wallet-communication/wallet-connection/browser-window-message'

// Send wallet connection info to Aepp through content script
const NODE_URL = 'https://sdk-testnet.aepps.com/'
const NODE_INTERNAL_URL = 'https://sdk-testnet.aepps.com/'
const COMPILER_URL = 'https://compiler.aepps.com'

export const wallet = {
  client: null,
  height: null,
  pub: null,
  balance: null,
  walletName: null,

  async disconnect () {
    await this.client.disconnectWallet()
    this.walletName = null
    this.pub = null
    this.balance = null
    await this.scanForWallets()
  },
  async getReverseWindow () {
    const iframe = document.createElement('iframe')
    //iframe.src = 'https://base.aepps.com/'
    iframe.src = 'https://localhost:8080/'
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    return iframe.contentWindow
  },
  async scanForWallets () {
    const scannerConnection = await BrowserWindowMessageConnection({
      connectionInfo: { id: 'spy' }
    })
    const detector = await Detector({ connection: scannerConnection })
    const handleWallets = async function ({ wallets, newWallet }) {
      if (confirm(`Desea conectar a la billetera ${newWallet.name}`)) {
        detector.stopScan()
        await this.client.connectToWallet(await newWallet.getConnection())
        await this.client.subscribeAddress('subscribe', 'current')
        this.pub = await this.client.address()
        this.balance = await this.client.balance(this.pub)
        this.walletName = this.client.rpcClient.info.name
      }
    }
    detector.scan(handleWallets.bind(this))
  },
  async init () {
    // Open iframe with Wallet if run in top window
    window !== window.parent || await this.getReverseWindow()
    //
    this.client = await RpcAepp({
      name: 'AEPP',
      url: NODE_URL,
      internalUrl: NODE_INTERNAL_URL,
      compilerUrl: COMPILER_URL
    })
    this.height = await this.client.height()
    await this.scanForWallets()
  }
}
