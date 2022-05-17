import { BigNumber, ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from 'web3modal'
import { useRouter } from 'next/router'

import {
  NFTAddress,
  MarketPlaceAddress
} from '../config'

// import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'
import MarketPlace from '../artifacts/contracts/MarketPlace.sol/MarketPlace.json'
import MyToken from '../artifacts/contracts/MyToken.sol/MyToken.json'

export default function MyAssets() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const router = useRouter()
  useEffect(() => {
    loadNFTs()
  }, [])

  async function loadNFTs() {
    console.log('Trying to load NFTs')
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    const walletAddress = await signer.getAddress()
    console.log(walletAddress)

    const NFTContract = new ethers.Contract(NFTAddress, MyToken.abi, signer)

    let ownerBalance = await NFTContract.balanceOf(walletAddress)
    ownerBalance = ownerBalance.toNumber()

    let items = []
    for (let i =0; i<ownerBalance; i++) {
      let nftIndex = await NFTContract.tokenOfOwnerByIndex(walletAddress, i)
      let tokenURI = await NFTContract.tokenURI(nftIndex)
      const meta = await axios.get(tokenURI)
      console.log(meta)
      let item = {
        tokenId: nftIndex.toNumber(),
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
        tokenURI
      }
      console.log(item)
      items.push(item)
    }
    setNfts(items)
    setLoadingState('loaded')
  }

  function listNFT(nft) {
    console.log('nft:', nft)
    router.push(`/list-nft?id=${nft.tokenId}&tokenURI=${nft.tokenURI}`)
  }

  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="py-10 px-20 text-3xl">No NFTs owned</h1>)
  return (
    <div className="flex justify-center">
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} className="rounded" />
                <div className="p-4 bg-black">
                  <p className="text-2xl font-bold text-white">{nft.name}</p>
                  <button className="mt-4 w-full bg-pink-500 text-white font-bold py-2 px-12 rounded" onClick={() => listNFT(nft)}>List</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}