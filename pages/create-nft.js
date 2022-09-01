import { useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'

import fleekStorage from '@fleekhq/fleek-storage-js'

import {
  NFTAddress,
  MarketPlaceAddress
} from '../config'

import MyToken from '../artifacts/contracts/MyToken.sol/MyToken.json'

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null)
  const [royalty, setRoyalty] = useState(false)
  // const [formInput, updateFormInput] = useState({ address: '', name: '', description: '' })
  const [formInput, updateFormInput] = useState({ name: '', description: '', royaltyValue: '', royaltyAddress: '' })
  const router = useRouter()

  async function onChange(e) {
    // load the file from disk
    const image = e.target.files[0]
    console.log(image)
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(image)
    reader.onloadend = async () => {

      try {

        const uploadedFile = await fleekStorage.upload({
          apiKey: process.env.FLEEK_STORAGE_API_KEY,
          apiSecret: process.env.FLEEK_STORAGE_API_SECRET,
          key: image.name,
          ContentType: image.type,
          data: Buffer(reader.result),
        });
        console.log(uploadedFile.hash)
        const url = `https://ipfs.io/ipfs/${uploadedFile.hash}`
        setFileUrl(url)
      } catch (err) {
        console.log('Error uploading file: ', err)
      }
    }
  }

  async function uploadToIPFS() {
    const { name, description } = formInput
    if (!name || !description || !fileUrl) return
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name, description, image: fileUrl
    })
    try {
        const uploadedFile = await fleekStorage.upload({
          apiKey: process.env.FLEEK_STORAGE_API_KEY,
          apiSecret: process.env.FLEEK_STORAGE_API_SECRET,
          key: 'test-key',
          ContentType: 'application/json',
          data: data
        });
      const url = `https://ipfs.io/ipfs/${uploadedFile.hash}`
      /* after file is uploaded to IPFS, return the URL to use it in the transaction */
      return url
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  async function createNFT() {
    const url = await uploadToIPFS()
    console.log(url)
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    /* next, create the item */
    let NFTContract = new ethers.Contract(NFTAddress, MyToken.abi, signer)

    // Marketplace with listing price
    // let listingPrice = await contract.getListingPrice()
    // listingPrice = listingPrice.toString()
    // let transaction = await contract.createToken(url, price, { value: listingPrice })
    let transaction = await NFTContract.mint(url)
    console.log('Minting NFT')
    await transaction.wait()
    console.log(transaction)

    const walletAddress = await signer.getAddress()
    let ownerBalance = await NFTContract.balanceOf(walletAddress)
    ownerBalance = ownerBalance.toNumber()
    console.log(`${walletAddress} has ${ownerBalance} NFTs`)

    if (royalty) {
      let royaltyValue = parseInt(parseFloat(formInput.royaltyValue) * 100)
      let nftIndex = await NFTContract.tokenOfOwnerByIndex(walletAddress, ownerBalance - 1)
      console.log(`Trying to set royalty with value: ${royaltyValue} @ ${formInput.royaltyAddress}`)
      console.log(nftIndex)
      transaction = await NFTContract.setTokenRoyalty(nftIndex, formInput.royaltyAddress, royaltyValue)
      await transaction.wait()
      console.log(transaction)
    }

    router.push('my-nfts')
  }



  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
        />
        <input
          type="file"
          name="Asset"
          className="my-4"
          onChange={onChange}
        />
        {
          fileUrl && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img className="rounded mt-4" width="350" src={fileUrl} />
          )
        }

        <div>
          <input
            type='checkbox'
            onChange={e => {
              setRoyalty(e.target.checked)
            }}
          />
          <input
            placeholder="Add Royalty to the asset"
            className="mt-4 p-4"
          />
        </div>
        {
          royalty && (
            <input
              placeholder="Royalty (in %)"
              type='number'
              step="0.01"
              className="mt-4 border rounded p-4"
              onChange={e => updateFormInput({ ...formInput, royaltyValue: e.target.value })}
            />
          )
        }
        {
          royalty && (
            <input
              placeholder="Royalty Address"
              className="mt-2 border rounded p-4"
              onChange={e => updateFormInput({ ...formInput, royaltyAddress: e.target.value })}
            />
          )
        }
        <button onClick={createNFT} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Create NFT
        </button>
      </div>
    </div>
  )
}