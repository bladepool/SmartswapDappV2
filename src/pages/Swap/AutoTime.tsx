import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ShowDetails from './components/details/ShowDetails';
import History from './components/history/History';
import From from './components/sendToken/From';
import To from './components/sendToken/To';
import SwapSettings from './components/sendToken/SwapSettings';
import { useActiveWeb3React } from '../../utils/hooks/useActiveWeb3React';
import { VectorIcon, ExclamationIcon, SwitchIcon } from '../../theme/components/Icons';
import { useAutoTimeActionHandlers, useDerivedAutoTimeInfo, useAutoTimeState } from '../../state/auto-time/hooks';
import { getERC20Token } from '../../utils/utilsFunctions';
import { Field } from '../../state/auto-time/actions';
import Web3 from 'web3';
import { RGP } from '../../utils/addresses';
import { ethers } from 'ethers';
import { getExplorerLink, ExplorerDataType } from '../../utils/getExplorerLink';
import {
  Box,
  Flex,
  Input,
  Text,
  Menu,
  Button,
  Image,
  Center,
  Spacer,
  VStack,
  InputGroup,
  InputRightAddon,
  MenuButton,
  useColorModeValue,
  useMediaQuery,
  Select
} from '@chakra-ui/react';
import {
  ChevronDownIcon
} from "@chakra-ui/icons";
import { useDispatch } from "react-redux";
import { autoSwapV2, rigelToken, SmartSwapRouter, otherMarketPriceContract } from '../../utils/Contracts';
import { RGPADDRESSES, AUTOSWAPV2ADDRESSES, WNATIVEADDRESSES, SMARTSWAPROUTER, OTHERMARKETADDRESSES } from '../../utils/addresses';
import { setOpenModal, TrxState } from "../../state/application/reducer";
import { changeFrequencyTodays } from '../../utils/utilsFunctions';


const SetPrice = () => {
  const [isMobileDevice] = useMediaQuery('(max-width: 750px)');
  const dispatch = useDispatch();
  const borderColor = useColorModeValue('#DEE6ED', '#324D68');
  const iconColor = useColorModeValue('#666666', '#DCE6EF');
  const textColorOne = useColorModeValue('#333333', '#F1F5F8');
  const bgColor = useColorModeValue('#ffffff', '#15202B');
  const buttonBgcolor = useColorModeValue('#F2F5F8', '#213345');
  const color = useColorModeValue('#999999', '#7599BD');
  const lightmode = useColorModeValue(true, false);
  const borderTwo = useColorModeValue('#319EF6', '#4CAFFF');
  const { account, library, chainId } = useActiveWeb3React()
  const { onCurrencySelection, onUserInput } = useAutoTimeActionHandlers();
  const { independentField, typedValue } = useAutoTimeState();
  const [signedTransaction, setSignedTransaction] = useState<{ r: string, s: string, _vs: string, mess: string, v: string, recoveryParam: string }>({
    r: "",
    s: "",
    _vs: "",
    mess: "",
    v: "",
    recoveryParam: ""
  }
  )
  const [hasBeenApproved, setHasBeenApproved] = useState(false)
  const [transactionSigned, setTransactionSigned] = useState(false)
  const [sendingTransaction, setSendingTransaction] = useState(false)
  const [selectedFrequency, setSelectedFrequency] = useState("daily")
  const [marketType, setMarketType] = useState("pancakeswap")
  const [successfullyTransaction, setSuccessfullyTransaction] = useState<String[] | []>([])
  const [percentageChange, setPercentageChange] = useState<string>("0")
  const [priceOut, setPriceOut] = useState<string>("")
  const [otherMarketprice, setOtherMarketprice] = useState<string>("0")
  const [approval, setApproval] = useState<String[]>([])

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value);
    },
    [onUserInput]
  );
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value);
    },
    [onUserInput]
  );
  const {
    currencies,
    inputError,
    showWrap,
    bestTrade,
    parsedAmount,
  } = useDerivedAutoTimeInfo();
  useEffect(async () => {
    await checkForApproval()
  }, [currencies[Field.INPUT]])
  // useEffect(() => {
  //   if (currencies[Field.INPUT] && currencies[Field.OUTPUT]) {
  //     getPriceForOne()
  //   }
  // }, [currencies[Field.INPUT], currencies[Field.OUTPUT]])

  useEffect(() => {
    if (chainId === 97 && account)
      getDataFromDataBase()
  }, [chainId, account])



  useMemo(async () => {
    if (currencies[Field.INPUT] && currencies[Field.OUTPUT]) {
      const rout = await SmartSwapRouter(SMARTSWAPROUTER[chainId as number], library);
      const routeAddress = currencies[Field.INPUT]?.isNative ? [WNATIVEADDRESSES[chainId as number], currencies[Field.OUTPUT]?.wrapped.address] :
        currencies[Field.OUTPUT]?.isNative ? [currencies[Field.INPUT]?.wrapped.address, WNATIVEADDRESSES[chainId as number]] :
          [currencies[Field.INPUT]?.wrapped.address, currencies[Field.OUTPUT]?.wrapped.address]
      console.log(routeAddress)
      const priceOutput = await rout.getAmountsOut(
        '1000000000000000000',
        routeAddress
      );
      setPriceOut(ethers.utils.formatUnits(priceOutput[1].toString(), currencies[Field.OUTPUT]?.decimals))
    }
  }, [currencies[Field.INPUT], currencies[Field.OUTPUT]])


  useMemo(async () => {
    if (chainId === 56 && currencies[Field.INPUT] && currencies[Field.OUTPUT]) {

      console.log(marketType, OTHERMARKETADDRESSES[marketType])
      const rout = await otherMarketPriceContract(OTHERMARKETADDRESSES[marketType], library);
      const routeAddress = currencies[Field.INPUT]?.isNative ? [WNATIVEADDRESSES[chainId as number], currencies[Field.OUTPUT]?.wrapped.address] :
        currencies[Field.OUTPUT]?.isNative ? [currencies[Field.INPUT]?.wrapped.address, WNATIVEADDRESSES[chainId as number]] :
          [currencies[Field.INPUT]?.wrapped.address, currencies[Field.OUTPUT]?.wrapped.address]
      console.log(routeAddress)
      if (typedValue) {
        const priceOutput = await rout.getAmountsOut(
          Web3.utils.toWei(typedValue, 'ether'),
          routeAddress
        );
        console.log(ethers.utils.formatUnits(priceOutput[1].toString(), currencies[Field.OUTPUT]?.decimals))
        setOtherMarketprice(ethers.utils.formatUnits(priceOutput[1].toString(), currencies[Field.OUTPUT]?.decimals))
      }
    }
  }, [chainId, currencies[Field.INPUT], currencies[Field.OUTPUT], marketType, typedValue])




  const getDataFromDataBase = async () => {
    try {
      let result = await fetch(`https://rigelprotocol-autoswap.herokuapp.com/auto/data/${account}`)
      const data = await result.json()
      setSuccessfullyTransaction([...data.transactionHash])
    } catch (e) {
      console.log(e)
    }

  }

  const checkForApproval = async () => {
    // check approval for RGP and the other token
    const RGPBalance = await checkApprovalForRGP(RGPADDRESSES[chainId as number])
    const tokenBalance = currencies[Field.INPUT]?.isNative ? 1 : await checkApproval(currencies[Field.INPUT]?.wrapped.address)
    if (parseFloat(RGPBalance) > 0 && parseFloat(tokenBalance) > 0) {
      setHasBeenApproved(true)
    } else if (parseFloat(RGPBalance) <= 0 && parseFloat(tokenBalance) <= 0) {
      setHasBeenApproved(false)
      setApproval(["RGP", currencies[Field.INPUT]?.wrapped.name])
    } else if (parseFloat(tokenBalance) <= 0) {
      setHasBeenApproved(false)
      setApproval([currencies[Field.INPUT].wrapped.name])
    } else if (parseFloat(RGPBalance) <= 0) {
      setHasBeenApproved(false)
      setApproval(["RGP"])
    }
  }

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
          [Field.INPUT]: typedValue,
          [Field.OUTPUT]: typedValue,
        }
        : {
          [Field.INPUT]:
            independentField === Field.INPUT ? parsedAmount : bestTrade,
          [Field.OUTPUT]:
            independentField === Field.OUTPUT ? parsedAmount : bestTrade,
        },
    [independentField, parsedAmount, showWrap, bestTrade]
  );

  const dependentField: Field =
    independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT;
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField] ?? "" //?.toExact() ?? ''
      : parsedAmounts[dependentField] ?? "", //?.toSignificant(6) ?? '',
  };


  const signTransaction = async () => {
    if (account !== undefined) {
      try {
        let web3 = new Web3(Web3.givenProvider);
        const permitHash = "0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9";

        const mess = web3.utils.soliditySha3(permitHash)

        let signature = await web3.eth.sign(mess, account);

        var sig = ethers.utils.splitSignature(signature)

        setSignedTransaction({ ...sig, mess })
        setTransactionSigned(true)

        // await checkForApproval()
      } catch (e) {
        dispatch(
          setOpenModal({
            message: "Signing wallet failed",
            trxState: TrxState.TransactionFailed,
          })
        );
      }

    } else {
      dispatch(
        setOpenModal({
          message: "connect wallet",
          trxState: TrxState.TransactionFailed,
        })
      );
    }

  }



  const viewTransactionHistory = () => {
    alert("we need a modal showing history")
  }

  const approveOneOrTwoTokens = async () => {
    if (currencies[Field.INPUT]?.isNative) {
      setHasBeenApproved(true);
      setApproval(approval.filter(t => t !== currencies[Field.INPUT]?.name))
    }
    if (setApproval.length > 0) {
      try {
        dispatch(
          setOpenModal({
            message: `Approve Tokens for Swap`,
            trxState: TrxState.WaitingForConfirmation,
          })
        );
        let arr = approval
        if (arr[0] === "RGP") {
          const address = RGPADDRESSES[chainId as number];
          const rgp = await rigelToken(RGP[chainId as number], library);
          const token = await getERC20Token(address, library);

          const walletBal = (await token.balanceOf(account)) + 4e18;
          const approveTransaction = await rgp.approve(
            AUTOSWAPV2ADDRESSES[chainId as number],
            walletBal,
            {
              from: account,
            }
          );

          arr.length > 1 ? setApproval([arr[1]]) : setApproval([])
        } else {
          // setRGPApproval(true)
        }
        if (approval[0] === currencies[Field.INPUT]?.name) {
          const address = currencies[Field.INPUT]?.wrapped.address;
          const token = await getERC20Token(address, library);
          const walletBal = (await token.balanceOf(account)) + 4e18;
          const approveTransaction = await token.approve(
            AUTOSWAPV2ADDRESSES[chainId as number],
            walletBal,
            {
              from: account,
            }
          );
          const { confirmations } = await approveTransaction.wait(1);
          if (confirmations >= 1) {
            dispatch(
              setOpenModal({
                message: `Approval Successful.`,
                trxState: TrxState.TransactionSuccessful,
              })
            );
          }
          setApproval([])
        } else {
          // setOtherTokenApproval(true)
        }
        dispatch(
          setOpenModal({
            message: `Approval Successful.`,
            trxState: TrxState.TransactionSuccessful,
          })
        );
      } catch (e) {
        console.log(e)
      }
    } else return

  }
  const sendTransactionToDatabase = async () => {
    const smartSwapV2Contract = await autoSwapV2(AUTOSWAPV2ADDRESSES[chainId as number], library);
    dispatch(
      setOpenModal({
        message: `Signing initial transaction between ${currencies[Field.INPUT]?.symbol} and ${currencies[Field.OUTPUT]?.symbol}`,
        trxState: TrxState.WaitingForConfirmation,
      })
    );
    const time = Date.now();
    let data
    if (currencies[Field.INPUT]?.isNative) {
      data = await smartSwapV2Contract.setPeriodToSwapETHForTokens(
        currencies[Field.OUTPUT]?.wrapped.address,
        account,
        time,
        signedTransaction?.mess,
        signedTransaction?.r,
        signedTransaction?.s,
        signedTransaction?.v,
        { value: Web3.utils.toWei(typedValue, 'ether') }
      )
    } else if (currencies[Field.OUTPUT]?.isNative) {
      data = await smartSwapV2Contract.setPeriodToswapTokensForETH(
        currencies[Field.INPUT]?.wrapped.address,
        account,
        Web3.utils.toWei(typedValue, 'ether'),
        time,
        signedTransaction?.mess,
        signedTransaction?.r,
        signedTransaction?.s,
        signedTransaction?.v,
      )
    } else {
      data = await smartSwapV2Contract.callPeriodToSwapExactTokens(
        currencies[Field.INPUT]?.wrapped.address,
        currencies[Field.OUTPUT]?.wrapped.address,
        account,
        Web3.utils.toWei(typedValue, 'ether'),
        time,
        signedTransaction?.mess,
        signedTransaction?.r,
        signedTransaction?.s,
        signedTransaction?.v,
      )
    }

    const fetchTransactionData = async (sendTransaction: any) => {
      const { confirmations, status, logs } = await sendTransaction.wait(1);

      return { confirmations, status, logs };
    };
    const { confirmations, status, logs } = await fetchTransactionData(data)
    let orderID = await smartSwapV2Contract.orderCount()
    if (confirmations >= 1 && status) {
      dispatch(
        setOpenModal({
          message: "Storing Transaction",
          trxState: TrxState.WaitingForConfirmation,
        })
      );
      const changeFrequencyToday = changeFrequencyTodays(selectedFrequency)
      console.log({ changeFrequencyToday })
      const response = await fetch('https://rigelprotocol-autoswap.herokuapp.com/auto/add', {
        method: "POST",
        mode: "cors",
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json'
          // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify({
          address: account,
          chainID: chainId,
          frequency: selectedFrequency,
          frequencyNumber: changeFrequencyToday.days,
          presentDate: changeFrequencyToday.today,
          presentMonth: changeFrequencyToday.month,
          fromAddress: currencies[Field.INPUT]?.isNative ? WNATIVEADDRESSES[chainId as number] : currencies[Field.INPUT]?.wrapped.address,
          toAddress: currencies[Field.OUTPUT]?.isNative ? WNATIVEADDRESSES[chainId as number] : currencies[Field.OUTPUT]?.wrapped.address,
          signature: signedTransaction,
          percentageChange,
          toNumberOfDecimals: currencies[Field.OUTPUT]?.wrapped.decimals,
          fromPrice: typedValue,
          currentToPrice: formattedAmounts[Field.OUTPUT],
          orderID: orderID.toString()

        })
      })
      const res = await response.json()
      console.log(res)
      dispatch(
        setOpenModal({
          message: "Successfully stored Transaction",
          trxState: TrxState.TransactionSuccessful,
        })
      );
      setApproval([])
      setSendingTransaction(true)
    }

  }


  const checkApproval = async (tokenAddress: string) => {
    if (currencies[Field.INPUT]?.isNative) {
      return setHasBeenApproved(true);
    }
    try {
      const status = await getERC20Token(tokenAddress, library);
      const check = await status.allowance(
        account,
        AUTOSWAPV2ADDRESSES[chainId as number],
        {
          from: account,
        }
      )

      const approveBalance = ethers.utils.formatEther(check).toString();
      return approveBalance
    } catch (e) {
      console.log(e)
    }

  }
  const checkApprovalForRGP = async (tokenAddress: string) => {

    try {
      const status = await rigelToken(tokenAddress, library);
      const check = await status.allowance(
        account,
        AUTOSWAPV2ADDRESSES[chainId as number],
        {
          from: account,
        }
      )

      const approveBalance = ethers.utils.formatEther(check).toString();
      return approveBalance
    } catch (e) {
      console.log(e)
    }

  }

  return (
    <Box fontSize="xl">
      <Flex
        minH="100vh"
        zIndex={1}
        mt={6}
        justifyContent="center"
        flexWrap="wrap"
      >
        {isMobileDevice ? (
          <>
            <Box mx={4} w={['100%', '100%', '45%', '29.5%']} mb={4}>
              <ShowDetails />
            </Box>

            <Box mx={4} mb={4} w={['100%', '100%', '45%', '29.5%']}
              borderColor={borderColor}
              borderWidth="1px"
              borderRadius="6px"
              pl={3}
              pr={3}
              pb={4}
            >
              <SwapSettings />
              <From
                onUserInput={handleTypeInput}
                onCurrencySelection={onCurrencySelection}
                currency={currencies[Field.INPUT]}
                otherCurrency={currencies[Field.OUTPUT]}
                value={typedValue}
              />
              <Flex justifyContent="center">
                <SwitchIcon />
              </Flex>
              <Box borderColor={borderColor} borderWidth="1px" borderRadius="6px" p={3} mt={4}>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={5} width="100%">
                  <To
                    onUserOutput={handleTypeOutput}
                    onCurrencySelection={onCurrencySelection}
                    currency={currencies[Field.OUTPUT]}
                    otherCurrency={currencies[Field.INPUT]}
                    value={formattedAmounts[Field.OUTPUT]}

                    display={true}
                  />
                </Box>

                <Box display="flex" pt={4} pb={4} pr={4} pl={4} borderColor={borderTwo} borderWidth="2px" borderRadius="2px" bg={buttonBgcolor}>
                  <Text color={textColorOne} fontSize="16px">
                    RigelProtocol
                  </Text>
                  <Spacer />
                  <VStack>
                    <Text fontSize="24px" color={textColorOne} isTruncated width="160px" textAlign="right">
                      {isNaN(parseFloat(formattedAmounts[Field.OUTPUT])) ? "0" : parseFloat(formattedAmounts[Field.OUTPUT])}
                    </Text>
                    <Text fontSize="14px" color={color} textAlign="right">
                      -2.56
                    </Text>
                  </VStack>
                </Box>
                <Box borderColor={borderColor} borderWidth="1px" borderRadius="6px" mt={5} pt={4} pb={4} pr={2} pl={2}>
                  <Flex>
                    <Select variant='unstyled' width="110px" cursor="pointer" onChange={(e) => setMarketType(e.target.value)}>
                      <option value='pancakeswap'>Pancakeswap</option>
                      <option value='sushiswap'>Sushiswap</option>
                    </Select>
                    <ChevronDownIcon mt={1} />
                    <Select variant='unstyled' placeholder='Unstyled'>
                      <option value='daily'>Daily</option>
                      <option value='weekly'>Weekly</option>
                      <option value='monthly'>Monthly</option>
                    </Select>
                    <Spacer />
                    <VStack>
                      <Text fontSize="24px" color={textColorOne} isTruncated width="160px" >
                        {otherMarketprice}
                      </Text>
                      <Text fontSize="14px" color={color}>
                        -2.67
                      </Text>
                    </VStack>
                  </Flex>
                </Box>
              </Box>

              <Flex mt={5}>
                <Center borderColor={iconColor} borderWidth="1px" borderRadius={4} w="20px" h="20px">
                  <VectorIcon />
                </Center>
                <Spacer />
                {currencies[Field.INPUT] && currencies[Field.OUTPUT] &&
                  <>
                    <Text fontSize="14px" mr={2} color={textColorOne}>
                      1 {currencies[Field.INPUT]?.symbol} = {priceOut} {currencies[Field.OUTPUT]?.symbol}
                    </Text>
                    <ExclamationIcon />
                  </>

                }

              </Flex>
              <Box display="flex" mt={5}>
                <VStack>
                  <Flex>
                    <Text fontSize="14px" mr={2}>
                      Swap if price changes by
                    </Text>
                    <ExclamationIcon />
                  </Flex>
                  <InputGroup size="md" borderRadius="4px" borderColor={borderColor}>
                    <Input placeholder="0" w="60px" value={percentageChange} />
                    <InputRightAddon children="%" fontSize="16px" />
                  </InputGroup>
                </VStack>
                <Spacer />
                <VStack>
                  <Flex>
                    <Text fontSize="14px" mr={2}>
                      Swap Every
                    </Text>
                    <ExclamationIcon />
                  </Flex>
                  <Menu>
                    <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="md" bg={bgColor} fontSize="16px" color={textColorOne} borderColor={borderColor} borderWidth="1px">
                      Week
                    </MenuButton>
                  </Menu>
                </VStack>
              </Box>
              <Box mt={5}>
                <Button
                  w="100%"
                  borderRadius="6px"
                  border={lightmode ? '2px' : 'none'}
                  borderColor={borderColor}
                  h="48px"
                  p="5px"
                  color={color}
                  bgColor={buttonBgcolor}
                  fontSize="18px"
                  boxShadow={lightmode ? 'base' : 'lg'}
                  _hover={{ bgColor: buttonBgcolor }}
                >
                  Enter Percentage
                </Button>
              </Box>
            </Box>

            <Box mx={4} w={['100%', '100%', '45%', '29.5%']} mb={4}>
              <History />
            </Box>
          </>
        ) : (
          <>
            <Box mx={4} w={['100%', '100%', '45%', '29.5%']} mb={4}>
              <ShowDetails />

              {account && successfullyTransaction.length > 0 && successfullyTransaction.map(transaction => {
                return <Text fontSize="13px" mb="10px"><a href={getExplorerLink(chainId as number, transaction, ExplorerDataType.TRANSACTION)} target="_blank">{transaction}</a></Text>
              })

              }
            </Box>

            <Box
              mx={4} mb={4} w={['100%', '100%', '45%', '29.5%']}
              borderColor={borderColor}
              borderWidth="1px"
              borderRadius="6px"
              pl={3}
              pr={3}
              pb={4}
            >
              <SwapSettings />
              <From
                onUserInput={handleTypeInput}
                onCurrencySelection={onCurrencySelection}
                currency={currencies[Field.INPUT]}
                otherCurrency={currencies[Field.OUTPUT]}
                value={typedValue}
              />
              <Flex justifyContent="center">
                <SwitchIcon />
              </Flex>
              <Box borderColor={borderColor} borderWidth="1px" borderRadius="6px" p={3} mt={4}>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
                  {/* <Text color={balanceColor} fontSize="14px">
                    Balance: 2.2332 USDT
                  </Text> */}
                  {/* <Menu>
                    <Button
                      border="0px"
                      h="40px"
                      w="120px"
                      rightIcon={<ChevronDownIcon />}
                      bgColor={tokenListTrgiggerBgColor}
                    >
                      <Image mr={3} h="24px" w="24px" src={USDTLOGO} />
                      <Text color={tokenListTriggerColor}>USDT</Text>
                    </Button>
                  </Menu> */}
                  <To
                    onUserOutput={handleTypeOutput}
                    onCurrencySelection={onCurrencySelection}
                    currency={currencies[Field.OUTPUT]}
                    otherCurrency={currencies[Field.INPUT]}
                    display={true}
                    value=""
                  />
                </Box>

                <Box display="flex" pt={4} pb={4} pr={4} pl={4} borderColor={borderTwo} borderWidth="2px" borderRadius="2px" bg={buttonBgcolor}>
                  <Text color={textColorOne} fontSize="16px" mt="2" >
                    RigelProtocol
                  </Text>
                  <Spacer />
                  <VStack>
                    <Text fontSize="24px" color={textColorOne} isTruncated width="160px" textAlign="right">
                      {isNaN(parseFloat(formattedAmounts[Field.OUTPUT])) ? "0" : parseFloat(formattedAmounts[Field.OUTPUT])}
                    </Text>
                    <Text fontSize="14px" color={color} textAlign="right">
                      -2.56
                    </Text>
                  </VStack>
                </Box>
                <Box borderColor={borderColor} borderWidth="1px" borderRadius="6px" mt={5} pt={4} pb={4} pr={2} pl={2}>
                  <Flex>
                    <Select variant='unstyled' width="110px" cursor="pointer" onChange={(e) => setMarketType(e.target.value)} textAlign="right">
                      <option value='pancakeswap'>Pancakeswap</option>
                      <option value='sushiswap'>Sushiswap</option>
                    </Select>

                    <Spacer />
                    <VStack>
                      <Text fontSize="24px" color={textColorOne} textAlign="right" isTruncated width="160px" >
                        {otherMarketprice}
                      </Text>
                      <Text fontSize="14px" color={color}>
                        -2.67
                      </Text>
                    </VStack>
                  </Flex>
                </Box>
              </Box>

              <Flex mt={5}>
                <Center borderColor={iconColor} borderWidth="1px" borderRadius={4} w="20px" h="20px">
                  <VectorIcon />
                </Center>
                <Spacer />
                {currencies[Field.INPUT] && currencies[Field.OUTPUT] &&
                  <>
                    <Text fontSize="14px" mr={2} color={textColorOne}>
                      1 {currencies[Field.INPUT]?.symbol} = {priceOut} {currencies[Field.OUTPUT]?.symbol}
                    </Text>
                    <ExclamationIcon />
                  </>

                }


              </Flex>
              <Box display="flex" mt={5}>
                <VStack>
                  <Flex>
                    <Text fontSize="14px" mr={2}>
                      Swap if price changes by
                    </Text>
                    <ExclamationIcon />
                  </Flex>
                  <InputGroup size="md" borderRadius="4px" borderColor={borderColor}>
                    <Input placeholder="0" w="60px" value={percentageChange} type="number" onChange={e => {
                      if (parseFloat(e.target.value) > 100) {
                        setPercentageChange("100")
                      } else {
                        setPercentageChange(e.target.value)
                      }

                    }} />
                    <InputRightAddon children="%" fontSize="16px" />
                  </InputGroup>
                </VStack>
                <Spacer />
                <VStack>
                  <Flex>
                    <Text fontSize="14px" mr={2}>
                      Swap Every
                    </Text>
                    <ExclamationIcon />
                  </Flex>
                  <Select onChange={(e) => setSelectedFrequency(e.target.value)}>
                    <option value='daily'>Daily</option>
                    <option value='weekly'>Weekly</option>
                    <option value='monthly'>Monthly</option>
                  </Select>
                </VStack>
              </Box>
              <Box mt={5}>
                {inputError ?
                  <Button
                    w="100%"
                    borderRadius="6px"
                    border={lightmode ? '2px' : 'none'}
                    borderColor={borderColor}
                    h="48px"
                    p="5px"
                    color={color}
                    bgColor={buttonBgcolor}
                    fontSize="18px"
                    boxShadow={lightmode ? 'base' : 'lg'}
                    _hover={{ bgColor: buttonBgcolor }}
                  >
                    {inputError}
                  </Button> : !transactionSigned ? <Button
                    w="100%"
                    borderRadius="6px"
                    border={lightmode ? '2px' : 'none'}
                    borderColor={borderColor}
                    onClick={signTransaction}
                    h="48px"
                    p="5px"
                    color={color}
                    bgColor={buttonBgcolor}
                    fontSize="18px"
                    boxShadow={lightmode ? 'base' : 'lg'}
                    _hover={{ bgColor: buttonBgcolor }}
                  >
                    Sign Wallet
                  </Button> : approval.length > 0 ? <Button
                    w="100%"
                    borderRadius="6px"
                    border={lightmode ? '2px' : 'none'}
                    borderColor={borderColor}
                    h="48px"
                    p="5px"
                    onClick={approveOneOrTwoTokens}
                    color={color}
                    bgColor={buttonBgcolor}
                    fontSize="18px"
                    boxShadow={lightmode ? 'base' : 'lg'}
                    _hover={{ bgColor: buttonBgcolor }}
                  >
                    Approve {approval.length > 0 && approval[0]} {approval.length > 1 && `and ${currencies[Field.INPUT]?.tokenInfo.name}`}
                  </Button> : !sendingTransaction ? <Button
                    w="100%"
                    borderRadius="6px"
                    border={lightmode ? '2px' : 'none'}
                    borderColor={borderColor}
                    h="48px"
                    p="5px"
                    color={color}
                    bgColor={buttonBgcolor}
                    onClick={sendTransactionToDatabase}
                    fontSize="18px"
                    boxShadow={lightmode ? 'base' : 'lg'}
                    _hover={{ bgColor: buttonBgcolor }}
                  >
                    Send Transaction
                  </Button> : <Button
                    w="100%"
                    borderRadius="6px"
                    border={lightmode ? '2px' : 'none'}
                    borderColor={borderColor}
                    h="48px"
                    p="5px"
                    color={color}
                    bgColor={buttonBgcolor}
                    onClick={viewTransactionHistory}
                    fontSize="18px"
                    boxShadow={lightmode ? 'base' : 'lg'}
                    _hover={{ bgColor: buttonBgcolor }}
                  >
                    Transaction running
                  </Button>
                }

              </Box>

            </Box>

            <Box mx={5} w={['100%', '100%', '45%', '29.5%']} mb={4}>
              <History />
            </Box>
          </>
        )}
      </Flex>
    </Box>
  )
}

export default SetPrice
