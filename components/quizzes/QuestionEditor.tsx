'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Dealer, Vulnerability, BidType, Suit, AnswerType } from '@prisma/client'
import LoadingSpinner from '../ui/LoadingSpinner'

interface Bid {
  bidType: BidType
  level?: number
  suit?: Suit
  position: string
  sequence: number
  alert?: {
    meaning: string
  }
}

export default function QuestionEditor() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const questionId = params?.questionId as string | undefined

  const [dealer, setDealer] = useState<Dealer>(Dealer.N)
  const [vulnerability, setVulnerability] = useState<Vulnerability>(Vulnerability.NONE)
  const [bids, setBids] = useState<Bid[]>([])
  const [prompt, setPrompt] = useState('')
  const [answerType, setAnswerType] = useState<AnswerType>(AnswerType.FORCING_NON_FORCING)
  const [answerOptions, setAnswerOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showAlertEditor, setShowAlertEditor] = useState<boolean>(false)
  const [alertMeaning, setAlertMeaning] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [viewingAlertIndex, setViewingAlertIndex] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  const positions = ['N', 'E', 'S', 'W']
  const dealers: Dealer[] = [Dealer.N, Dealer.E, Dealer.S, Dealer.W]
  const vulnerabilities: Vulnerability[] = [Vulnerability.NONE, Vulnerability.NS, Vulnerability.EW, Vulnerability.ALL]
  const suits: Suit[] = useMemo(() => [Suit.CLUB, Suit.DIAMOND, Suit.HEART, Suit.SPADE, Suit.NO_TRUMP], [])
  
  // Get available answer types based on last bid
  const getAvailableAnswerTypes = (): AnswerType[] => {
    if (bids.length === 0) {
      // No bids yet - show all except double/redouble interpretation
      return [
        AnswerType.FORCING_NON_FORCING,
        AnswerType.FREE_ANSWER,
        AnswerType.MULTIPLE_CHOICE,
      ]
    }
    
    const lastBid = bids[bids.length - 1]
    const available: AnswerType[] = []
    
    // Forcing/Non-forcing: only for contract bids or pass
    if (lastBid.bidType === BidType.CONTRACT || lastBid.bidType === BidType.PASS) {
      available.push(AnswerType.FORCING_NON_FORCING)
    }
    
    // Double Interpretation: only for doubles
    if (lastBid.bidType === BidType.DOUBLE) {
      available.push(AnswerType.DOUBLE_INTERPRETATION)
    }
    
    // Redouble Interpretation: only for redoubles
    if (lastBid.bidType === BidType.REDOUBLE) {
      available.push(AnswerType.REDOUBLE_INTERPRETATION)
    }
    
    // Free Answer and Multiple Choice: always available
    available.push(AnswerType.FREE_ANSWER)
    available.push(AnswerType.MULTIPLE_CHOICE)
    
    return available
  }
  
  const availableAnswerTypes = getAvailableAnswerTypes()

  const fetchQuestion = useCallback(async () => {
    if (!questionId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/questions/get?id=${questionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch question')
      }
      const data = await response.json()
      const question = data.question

      // Set basic question data
      setPrompt(question.prompt)
      setAnswerType(question.answerType)
      
      // Set answer options if they exist
      if (question.answerOptions && Array.isArray(question.answerOptions)) {
        setAnswerOptions(question.answerOptions)
      } else if (question.answerType === AnswerType.DOUBLE_INTERPRETATION && (!question.answerOptions || !Array.isArray(question.answerOptions))) {
        // Default options for double interpretation
        setAnswerOptions(['Penalty', 'Take-out', 'Values'])
      } else if (question.answerType === AnswerType.REDOUBLE_INTERPRETATION && (!question.answerOptions || !Array.isArray(question.answerOptions))) {
        // Default options for redouble interpretation
        setAnswerOptions(['SOS', 'Extra values', 'To play'])
      } else {
        setAnswerOptions([])
      }

      // Set auction data
      if (question.auction) {
        setDealer(question.auction.dealer)
        setVulnerability(question.auction.vulnerability)
        
        // Convert database bids to local Bid format
        const auctionBids = question.auction.bids
          .sort((a: Bid, b: Bid) => a.sequence - b.sequence)
          .map((bid: any) => ({
            ...bid,
            alert: bid.alert || undefined,
          }))
        setBids(auctionBids)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }, [questionId])

  useEffect(() => {
    if (questionId) {
      fetchQuestion()
    }
  }, [questionId, fetchQuestion])

  // Generate default prompt based on last bid and answer type
  const generateDefaultPrompt = (): string => {
    if (bids.length === 0) {
      return ''
    }
    
    const lastBid = bids[bids.length - 1]
    const suitSymbols: Record<Suit, string> = {
      CLUB: '♣',
      DIAMOND: '♦',
      HEART: '♥',
      SPADE: '♠',
      NO_TRUMP: 'NT',
    }
    
    let bidText = ''
    if (lastBid.bidType === BidType.CONTRACT) {
      bidText = `${lastBid.level}${suitSymbols[lastBid.suit!]}`
    } else if (lastBid.bidType === BidType.PASS) {
      bidText = 'Pass'
    } else if (lastBid.bidType === BidType.DOUBLE) {
      bidText = 'X'
    } else if (lastBid.bidType === BidType.REDOUBLE) {
      bidText = 'XX'
    } else {
      bidText = lastBid.bidType
    }
    
    // Use "Is x by y forcing?" for forcing/non-forcing answer type
    if (answerType === AnswerType.FORCING_NON_FORCING) {
      return `Is ${bidText} by ${lastBid.position} forcing?`
    }
    
    // Default prompt for other answer types
    return `What does ${bidText} by ${lastBid.position} mean?`
  }

  // Update prompt to default when bids or answer type change (only if prompt is empty or matches previous default)
  useEffect(() => {
    if (!questionId && bids.length > 0) {
      const defaultPrompt = generateDefaultPrompt()
      // Only update if prompt is empty or matches a previous default pattern
      if (!prompt || prompt.match(/^What does .+ by [NESW] mean\?$/) || prompt.match(/^Is .+ by [NESW] forcing\?$/)) {
        setPrompt(defaultPrompt)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, answerType, questionId])


  const getNextPosition = useCallback((sequence: number): string => {
    const dealers = ['N', 'E', 'S', 'W']
    const positions = ['N', 'E', 'S', 'W']
    const dealerIndex = dealers.indexOf(dealer)
    return positions[(dealerIndex + sequence) % 4]
  }, [dealer])

  const isVulnerable = (position: string): boolean => {
    switch (vulnerability) {
      case Vulnerability.NONE:
        return false
      case Vulnerability.NS:
        return position === 'N' || position === 'S'
      case Vulnerability.EW:
        return position === 'E' || position === 'W'
      case Vulnerability.ALL:
        return true
      default:
        return false
    }
  }

  // Get the last contract bid (ignoring pass, double, redouble)
  const getLastContractBid = useCallback((): Bid | null => {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].bidType === BidType.CONTRACT) {
        return bids[i]
      }
    }
    return null
  }, [bids])

  // Get the last non-pass bid (for double checking)
  const getLastNonPassBid = (): Bid | null => {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].bidType !== BidType.PASS) {
        return bids[i]
      }
    }
    return null
  }

  // Get contract rank (higher number = higher rank)
  const getContractRank = useCallback((level: number, suit: Suit): number => {
    const suitRanks: Record<Suit, number> = {
      CLUB: 1,
      DIAMOND: 2,
      HEART: 3,
      SPADE: 4,
      NO_TRUMP: 5,
    }
    return level * 10 + suitRanks[suit]
  }, [])

  // Check if a position is an opponent of another position
  const isOpponent = useCallback((pos1: string, pos2: string): boolean => {
    const isNS1 = pos1 === 'N' || pos1 === 'S'
    const isNS2 = pos2 === 'N' || pos2 === 'S'
    return isNS1 !== isNS2
  }, [])

  // Get available levels for contract bids
  const getAvailableLevels = useMemo(() => {
    const lastContractBid = getLastContractBid()
    let minRank = 0
    
    if (lastContractBid) {
      minRank = getContractRank(lastContractBid.level!, lastContractBid.suit!)
    }

    const levels: number[] = []
    for (let level = 1; level <= 7; level++) {
      // Check if any suit at this level would outrank
      for (const suit of suits) {
        const rank = getContractRank(level, suit)
        if (rank > minRank) {
          levels.push(level)
          break
        }
      }
    }
    return levels
  }, [getLastContractBid, getContractRank, suits])

  // Get available suits for a selected level
  const getAvailableSuits = useMemo(() => {
    if (!selectedLevel) return []
    
    const lastContractBid = getLastContractBid()
    let minRank = 0
    
    if (lastContractBid) {
      minRank = getContractRank(lastContractBid.level!, lastContractBid.suit!)
    }

    return suits.filter(suit => {
      const rank = getContractRank(selectedLevel, suit)
      return rank > minRank
    })
  }, [selectedLevel, getLastContractBid, getContractRank, suits])

  // Check if auction has ended
  const isAuctionEnded = useMemo(() => {
    if (bids.length === 0) return false
    
    // Check for 4 passes at start (passed-out hand)
    if (bids.length === 4) {
      const allPasses = bids.every((bid) => bid.bidType === BidType.PASS)
      if (allPasses) return true
    }
    
    // Check for 3 consecutive passes after a contract bid
    if (bids.length >= 3) {
      // Find if there was a contract bid before the last three bids
      let contractBidFound = false
      for (let i = bids.length - 4; i >= 0; i--) {
        if (bids[i].bidType === BidType.CONTRACT) {
          contractBidFound = true
          break
        }
      }
      
      if (contractBidFound) {
        const lastThree = bids.slice(-3)
        const allPasses = lastThree.every((bid) => bid.bidType === BidType.PASS)
        if (allPasses) return true
      }
    }
    
    return false
  }, [bids])

  // Check if pass is available
  const isPassAvailable = !isAuctionEnded

  // Check if double is available
  const isDoubleAvailable = useMemo(() => {
    if (isAuctionEnded) return false
    
    // Cannot double if there are no bids
    if (bids.length === 0) return false
    
    // Cannot double after a redouble (even if passes follow)
    const lastBid = bids[bids.length - 1]
    if (lastBid.bidType === BidType.REDOUBLE) return false
    
    // Need a contract bid to double
    const lastContractBid = getLastContractBid()
    if (!lastContractBid) return false
    
    // Check if the last contract bid has been doubled and redoubled
    // If so, it cannot be doubled again
    const contractBidIndex = bids.findIndex(b => b === lastContractBid)
    if (contractBidIndex >= 0) {
      // Look for double and redouble after this contract bid
      let foundDouble = false
      let foundRedouble = false
      
      for (let i = contractBidIndex + 1; i < bids.length; i++) {
        if (bids[i].bidType === BidType.DOUBLE) {
          foundDouble = true
        } else if (bids[i].bidType === BidType.REDOUBLE && foundDouble) {
          foundRedouble = true
          break
        } else if (bids[i].bidType === BidType.CONTRACT) {
          // New contract bid resets the double/redouble sequence
          foundDouble = false
          foundRedouble = false
        }
      }
      
      // If the contract was doubled and redoubled, cannot double again
      if (foundRedouble) return false
    }
    
    // Can only double opponent's contract bid
    const currentPosition = getNextPosition(bids.length)
    return isOpponent(currentPosition, lastContractBid.position)
  }, [bids, isAuctionEnded, getLastContractBid, getNextPosition, isOpponent])

  // Check if redouble is available
  const isRedoubleAvailable = useMemo(() => {
    if (isAuctionEnded) return false
    if (bids.length === 0) return false
    
    const lastBid = bids[bids.length - 1]
    // Can only redouble after a double (not after a redouble)
    return lastBid.bidType === BidType.DOUBLE
  }, [bids, isAuctionEnded])

  const addBid = (bidType: BidType, level?: number, suit?: Suit, alert?: { meaning: string }) => {
    const newBid: Bid = {
      bidType,
      level,
      suit,
      position: getNextPosition(bids.length),
      sequence: bids.length,
      alert: alert ? { meaning: alert.meaning.trim() } : undefined,
    }
    setBids([...bids, newBid])
    setSelectedLevel(null) // Reset level selection after adding bid
    setShowAlertEditor(false) // Reset alert checkbox after adding bid
    setAlertMeaning('') // Clear alert meaning
    
    // Automatically set answer type to default based on bid type
    const updatedBids = [...bids, newBid]
    const lastBid = updatedBids[updatedBids.length - 1]
    
    if (lastBid.bidType === BidType.DOUBLE) {
      // Double → Double interpretation
      setAnswerType(AnswerType.DOUBLE_INTERPRETATION)
      setAnswerOptions(['Penalty', 'Take-out', 'Values'])
    } else if (lastBid.bidType === BidType.REDOUBLE) {
      // Redouble → Redouble interpretation
      setAnswerType(AnswerType.REDOUBLE_INTERPRETATION)
      setAnswerOptions(['SOS', 'Extra values', 'To play'])
    } else if (lastBid.bidType === BidType.CONTRACT || lastBid.bidType === BidType.PASS) {
      // Pass or contract bid → Forcing/Non-forcing
      setAnswerType(AnswerType.FORCING_NON_FORCING)
      setAnswerOptions([])
    }
  }

  const undoBid = () => {
    if (bids.length > 0) {
      const newBids = bids.slice(0, -1)
      setBids(newBids)
      setSelectedLevel(null)
      
      // Reset answer type to default based on new last bid
      if (newBids.length === 0) {
        // No bids left - reset to default
        setAnswerType(AnswerType.FORCING_NON_FORCING)
        setAnswerOptions([])
      } else {
        const lastBid = newBids[newBids.length - 1]
        if (lastBid.bidType === BidType.DOUBLE) {
          setAnswerType(AnswerType.DOUBLE_INTERPRETATION)
          setAnswerOptions(['Penalty', 'Take-out', 'Values'])
        } else if (lastBid.bidType === BidType.REDOUBLE) {
          setAnswerType(AnswerType.REDOUBLE_INTERPRETATION)
          setAnswerOptions(['SOS', 'Extra values', 'To play'])
        } else if (lastBid.bidType === BidType.CONTRACT || lastBid.bidType === BidType.PASS) {
          setAnswerType(AnswerType.FORCING_NON_FORCING)
          setAnswerOptions([])
        }
      }
    }
  }

  const handleLevelClick = (level: number) => {
    setSelectedLevel(level)
  }

  const handleSuitClick = (suit: Suit) => {
    if (selectedLevel) {
      handleBidWithAlert(BidType.CONTRACT, selectedLevel, suit)
    }
  }

  const insertSuitSymbol = (suit: Suit) => {
    const symbol = suitSymbols[suit]
    const textarea = document.getElementById('alert-meaning-textarea') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = alertMeaning
      const newText = text.substring(0, start) + symbol + text.substring(end)
      setAlertMeaning(newText)
      // Set cursor position after inserted symbol
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + symbol.length, start + symbol.length)
      }, 0)
    } else {
      setAlertMeaning(alertMeaning + symbol)
    }
  }

  const handleBidWithAlert = (bidType: BidType, level?: number, suit?: Suit) => {
    if (showAlertEditor && alertMeaning.trim()) {
      addBid(bidType, level, suit, { meaning: alertMeaning })
    } else {
      addBid(bidType, level, suit)
    }
  }

  const getBidDisplay = (bid: Bid): string => {
    if (bid.bidType === BidType.CONTRACT) {
      const suitSymbols: Record<Suit, string> = {
        CLUB: '♣',
        DIAMOND: '♦',
        HEART: '♥',
        SPADE: '♠',
        NO_TRUMP: 'NT',
      }
      return `${bid.level}${suitSymbols[bid.suit!]}`
    }
    if (bid.bidType === BidType.PASS) return 'Pass'
    if (bid.bidType === BidType.DOUBLE) return 'X'
    if (bid.bidType === BidType.REDOUBLE) return 'XX'
    return bid.bidType
  }

  // Get bids for each position
  const getBidsForPosition = (position: string): Bid[] => {
    return bids.filter(b => b.position === position)
  }

  const validateAuction = async () => {
    try {
      const response = await fetch('/api/auctions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealer,
          vulnerability,
          bids: bids.map(b => ({
            bidType: b.bidType,
            level: b.level,
            suit: b.suit,
            position: b.position,
            sequence: b.sequence,
          })),
        }),
      })

      const data = await response.json()
      if (!data.valid) {
        setValidationErrors(data.errors?.map((e: any) => e.message) || [])
        return false
      }
      setValidationErrors([])
      return true
    } catch (err) {
      setValidationErrors(['Failed to validate auction'])
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (bids.length === 0) {
      setError('Please add at least one bid to the auction')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a question prompt')
      return
    }

    // Validate answer options for multiple choice, double interpretation, and redouble interpretation
    if (answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION || answerType === AnswerType.REDOUBLE_INTERPRETATION) {
      const validOptions = answerOptions.filter(opt => opt.trim().length > 0)
      if (answerType === AnswerType.MULTIPLE_CHOICE && validOptions.length < 2) {
        setError('Multiple choice questions require at least 2 options')
        return
      }
      if (validOptions.length === 0) {
        setError('Please provide at least one answer option')
        return
      }
      // Update answerOptions to only include non-empty options
      setAnswerOptions(validOptions)
    }

    const isValid = await validateAuction()
    if (!isValid) {
      setError('Auction validation failed. Please check the errors below.')
      return
    }

    setLoading(true)

    try {
      const url = questionId ? '/api/questions/update' : '/api/questions/create'
      const method = questionId ? 'PUT' : 'POST'

      // Prepare answer options - only include for MULTIPLE_CHOICE, DOUBLE_INTERPRETATION, and REDOUBLE_INTERPRETATION
      const answerOptionsData = (answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION || answerType === AnswerType.REDOUBLE_INTERPRETATION)
        ? answerOptions.filter(opt => opt.trim().length > 0)
        : null

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(questionId ? { questionId } : { quizId }),
          auction: {
            dealer,
            vulnerability,
            bids: bids.map(b => ({
              bidType: b.bidType,
              level: b.level,
              suit: b.suit,
              position: b.position,
              sequence: b.sequence,
            })),
          },
          prompt: prompt.trim(),
          answerType,
          ...(answerOptionsData ? { answerOptions: answerOptionsData } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error - could be string or object with message
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || data.error || 'Failed to save question'
        setError(errorMessage)
        setLoading(false)
        return
      }

      // Save alerts for all bids
      if (data.question?.id) {
        for (let i = 0; i < bids.length; i++) {
          if (bids[i].alert) {
            const bidId = data.question.auction?.bids?.[i]?.id
            if (bidId) {
              await fetch('/api/alerts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bidId,
                  meaning: bids[i].alert!.meaning,
                }),
              })
            }
          }
        }
      }

      router.push(`/quizzes/${quizId}/edit`)
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const suitSymbols: Record<Suit, string> = {
    CLUB: '♣',
    DIAMOND: '♦',
    HEART: '♥',
    SPADE: '♠',
    NO_TRUMP: 'NT',
  }

  // Get card color for suit
  const getSuitColor = (suit: Suit): string => {
    switch (suit) {
      case Suit.CLUB:
        return '#22c55e' // green
      case Suit.DIAMOND:
        return '#f97316' // orange
      case Suit.HEART:
        return '#ef4444' // red
      case Suit.SPADE:
        return '#1e40af' // dark blue
      case Suit.NO_TRUMP:
        return '#000000' // black
      default:
        return '#000000'
    }
  }

  // Mobile detection
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Organize bids into rounds for mobile table view
  const getBiddingRounds = (): Array<Array<Bid | null>> => {
    const rounds: Array<Array<Bid | null>> = []
    const positions = ['N', 'E', 'S', 'W']
    const dealerIndex = positions.indexOf(dealer)
    
    // Create a map of sequence to bid
    const bidMap = new Map<number, Bid>()
    bids.forEach(bid => {
      bidMap.set(bid.sequence, bid)
    })
    
    if (bids.length === 0) return rounds
    
    // Calculate number of rounds needed
    const totalRounds = Math.ceil(bids.length / 4)
    
    for (let round = 0; round < totalRounds; round++) {
      const roundBids: Array<Bid | null> = []
      for (let posOffset = 0; posOffset < 4; posOffset++) {
        const sequence = round * 4 + posOffset
        const positionIndex = (dealerIndex + posOffset) % 4
        const position = positions[positionIndex]
        
        // Find bid at this sequence
        const bid = bidMap.get(sequence)
        if (bid) {
          roundBids.push(bid)
        } else {
          roundBids.push(null)
        }
      }
      rounds.push(roundBids)
    }
    
    return rounds
  }

  const biddingRounds = getBiddingRounds()

  // Get bid cell style for mobile table
  const getMobileBidCellStyle = (bid: Bid | null): React.CSSProperties => {
    if (!bid) {
      return {
        padding: '0.5rem',
        textAlign: 'center',
        border: '1px solid #ddd',
        backgroundColor: '#f9f9f9',
      }
    }

    const baseStyle: React.CSSProperties = {
      padding: '0.5rem',
      textAlign: 'center',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontWeight: 'bold',
      fontSize: '0.9rem',
    }

    if (bid.bidType === BidType.CONTRACT && bid.suit) {
      return {
        ...baseStyle,
        color: getSuitColor(bid.suit),
        backgroundColor: '#fff',
      }
    } else if (bid.bidType === BidType.DOUBLE) {
      return {
        ...baseStyle,
        backgroundColor: '#ef4444',
        color: '#fff',
      }
    } else if (bid.bidType === BidType.REDOUBLE) {
      return {
        ...baseStyle,
        backgroundColor: '#1e40af',
        color: '#fff',
      }
    } else if (bid.bidType === BidType.PASS) {
      return {
        ...baseStyle,
        backgroundColor: '#22c55e',
        color: '#fff',
      }
    }

    return baseStyle
  }

  // Get rotation angle for position
  const getRotation = (position: string): string => {
    switch (position) {
      case 'N': return '0deg'
      case 'E': return '90deg'
      case 'S': return '180deg'
      case 'W': return '270deg'
      default: return '0deg'
    }
  }

  // Get card style for a bid (all cards use North's layout, rotated)
  const getBidCardStyle = (bid: Bid, index: number, totalBids: number, position: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      border: bid.alert ? '2px solid #f90' : '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
      position: 'relative',
      zIndex: index + 1, // First card on bottom (lower z-index)
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '0.5rem',
      transform: `rotate(${getRotation(position)})`,
      transformOrigin: 'center',
    }

    if (bid.bidType === BidType.CONTRACT && bid.suit) {
      return {
        ...baseStyle,
        width: '80px',
        height: '50px',
        color: getSuitColor(bid.suit),
        fontWeight: 'bold',
      }
    } else if (bid.bidType === BidType.DOUBLE) {
      return {
        ...baseStyle,
        width: '80px',
        height: '50px',
        backgroundColor: '#ef4444', // red
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1.1rem',
      }
    } else if (bid.bidType === BidType.REDOUBLE) {
      return {
        ...baseStyle,
        width: '80px',
        height: '50px',
        backgroundColor: '#1e40af', // dark blue
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '0.9rem',
      }
    } else if (bid.bidType === BidType.PASS) {
      return {
        ...baseStyle,
        width: '80px',
        height: '50px',
        backgroundColor: '#22c55e', // green
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '0.85rem',
        textAlign: 'left',
        padding: '0.5rem',
      }
    }

    return baseStyle
  }

  if (loading && questionId && bids.length === 0 && !prompt) {
    return <LoadingSpinner message="Loading question..." />
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '1200px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        {questionId ? 'Edit Question' : 'Create Question'}
      </h2>

      <div className="question-editor-layout">
        {/* Left: Bridge Table */}
        <div className="question-editor-auction-section">
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Dealer
                </label>
                <select
                  value={dealer}
                  onChange={(e) => {
                    const newDealer = e.target.value as Dealer
                    const oldDealerIndex = positions.indexOf(dealer)
                    const newDealerIndex = positions.indexOf(newDealer)
                    const rotation = (newDealerIndex - oldDealerIndex + 4) % 4
                    
                    // Rotate all bid positions
                    const newBids = bids.map((bid) => {
                      const currentPositionIndex = positions.indexOf(bid.position)
                      const newPositionIndex = (currentPositionIndex + rotation) % 4
                      return {
                        ...bid,
                        position: positions[newPositionIndex],
                      }
                    })
                    
                    setDealer(newDealer)
                    setBids(newBids)
                  }}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  {dealers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Vulnerability
                </label>
                <select
                  value={vulnerability}
                  onChange={(e) => setVulnerability(e.target.value as Vulnerability)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  {vulnerabilities.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auction Display */}
            {mounted && isMobile ? (
              /* Mobile Table Layout */
              <div style={{ width: '100%', position: 'relative' }}>
                {/* Alert tooltip - displayed above the table on mobile */}
                {viewingAlertIndex !== null && bids[viewingAlertIndex]?.alert && (
                  <div
                    style={{
                      marginBottom: '1rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#333',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      textAlign: 'left',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Alert Meaning:</div>
                    <div>{bids[viewingAlertIndex].alert!.meaning}</div>
                  </div>
                )}
                <div style={{ width: '100%', overflowX: 'auto', marginBottom: '1rem' }}>
                  <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                }}>
                  <thead>
                    <tr>
                      {['N', 'E', 'S', 'W'].map((pos) => (
                        <th
                          key={pos}
                          style={{
                            padding: '0.75rem 0.5rem',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                            border: '1px solid #333',
                            fontSize: '0.85rem',
                          }}
                        >
                          {pos}
                          {dealer === pos && ' (D)'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {biddingRounds.map((round, roundIndex) => (
                      <tr key={roundIndex}>
                        {round.map((bid, colIndex) => {
                          const position = ['N', 'E', 'S', 'W'][colIndex]
                          const globalIndex = bid ? bids.findIndex(b => b === bid) : -1
                          const cellStyle = getMobileBidCellStyle(bid)
                          const isViewingAlert = viewingAlertIndex === globalIndex
                          
                          return (
                            <td
                              key={colIndex}
                              style={{
                                ...cellStyle,
                                position: 'relative',
                                cursor: bid?.alert ? 'pointer' : 'default',
                              }}
                              onClick={() => {
                                if (bid?.alert) {
                                  setViewingAlertIndex(isViewingAlert ? null : globalIndex)
                                }
                              }}
                            >
                              {bid ? (
                                <>
                                  {getBidDisplay(bid)}
                                  {bid.alert && (
                                    <span style={{
                                      marginLeft: '0.25rem',
                                      fontSize: '0.7rem',
                                      color: '#f90',
                                    }}>
                                      ⚠
                                    </span>
                                  )}
                                </>
                              ) : (
                                '-'
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              /* Desktop Bridge Table */
              <div style={{
                position: 'relative',
                width: '400px',
                height: '400px',
                margin: '0 auto',
                border: '3px solid #333',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
              }}>
              {/* Center Compass */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90px',
                height: '90px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff',
                border: '2px solid #333',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}>
                {/* Compass directions */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  color: '#1e40af',
                }}>N</div>
                <div style={{
                  position: 'absolute',
                  right: '6px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  color: '#1e40af',
                }}>E</div>
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  color: '#1e40af',
                }}>S</div>
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  color: '#1e40af',
                }}>W</div>
                {/* Center dot */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#333',
                  borderRadius: '50%',
                }}></div>
                {/* Dealer indicator */}
                {dealer && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    fontSize: '0.75rem',
                    color: '#666',
                    fontWeight: 'bold',
                  }}>
                    Dealer: {dealer}
                  </div>
                )}
              </div>

              {/* Stacked Bidding Cards */}
              {positions.map((pos) => {
                const positionBids = getBidsForPosition(pos)
                
                // Container for all cards at this position
                let containerStyle: React.CSSProperties = {}
                
                // Place cards on the edges of the table for more space
                if (pos === 'N') {
                  containerStyle = {
                    position: 'absolute',
                    top: '50px', // Move down from top edge
                    left: '50%',
                  }
                } else if (pos === 'E') {
                  containerStyle = {
                    position: 'absolute',
                    right: '50px', // Move left from right edge
                    top: '50%',
                  }
                } else if (pos === 'S') {
                  containerStyle = {
                    position: 'absolute',
                    bottom: '50px', // Move up from bottom edge
                    left: '50%',
                  }
                } else if (pos === 'W') {
                  containerStyle = {
                    position: 'absolute',
                    left: '25px', // Keep good distance
                    top: '50%',
                  }
                }
                
                return (
                  <div
                    key={pos}
                    style={{
                      ...containerStyle,
                      position: 'absolute',
                    }}
                  >
                    {positionBids.map((bid, idx) => {
                      const globalIndex = bids.findIndex(b => b === bid)
                      const cardStyle = getBidCardStyle(bid, idx, positionBids.length, pos)
                      
                      // Card dimensions (before rotation)
                      const cardHeight = 50
                      const cardWidth = 80
                      const overlap = 60 // Most of card hidden, only edge visible
                      const stackOffset = 30 // Shift for stacking cards (larger = less overlap, more visible)
                      
                      // Calculate absolute position for each card
                      // Cards are rotated, so we need to account for that in positioning
                      let cardPositionStyle: React.CSSProperties = {}
                      
                      if (pos === 'N') {
                        // North: stack left to right from center, cards not rotated
                        // All cards start at same position (centered), then shift right by small amount
                        const firstCardX = -cardWidth / 2 // Center the first card horizontally
                        const cardX = firstCardX + idx * stackOffset
                        cardPositionStyle = {
                          position: 'absolute',
                          left: `${cardX}px`,
                          top: `${-cardHeight / 2}px`, // Center vertically
                        }
                      } else if (pos === 'E') {
                        // East: stack top to bottom from center, cards rotated 90deg
                        // When rotated 90deg, width becomes height and height becomes width
                        // All cards start at same position (centered), then shift down by small amount
                        const firstCardY = -cardWidth / 2 // Center the first card vertically (using width since rotated)
                        const cardY = firstCardY + idx * stackOffset
                        cardPositionStyle = {
                          position: 'absolute',
                          top: `${cardY}px`,
                          left: `${-cardHeight / 2}px`, // Center horizontally
                        }
                      } else if (pos === 'S') {
                        // South: stack right to left from center, cards rotated 180deg
                        // All cards start at same position (centered), then shift left by small amount
                        const firstCardX = -cardWidth / 2 // Center the first card horizontally
                        const cardX = firstCardX - idx * stackOffset
                        cardPositionStyle = {
                          position: 'absolute',
                          left: `${cardX}px`,
                          top: `${-cardHeight / 2}px`, // Center vertically
                        }
                      } else if (pos === 'W') {
                        // West: stack bottom to top from center, cards rotated 270deg
                        // When rotated 270deg, width becomes height and height becomes width
                        // All cards start at same position (centered), then shift up by small amount
                        const firstCardY = -cardWidth / 2 // Center the first card vertically (using width since rotated)
                        const cardY = firstCardY - idx * stackOffset
                        cardPositionStyle = {
                          position: 'absolute',
                          top: `${cardY}px`,
                          left: `${-cardHeight / 2}px`, // Center horizontally
                        }
                      }
                      
                      const isViewingAlert = viewingAlertIndex === globalIndex
                      
                      return (
                        <div key={idx} style={cardPositionStyle}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (bid.alert) {
                                setViewingAlertIndex(isViewingAlert ? null : globalIndex)
                              }
                            }}
                            style={{
                              ...cardStyle,
                              cursor: bid.alert ? 'pointer' : 'default',
                            }}
                          >
                            {bid.bidType === BidType.CONTRACT && bid.suit && (
                              <>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '0px',
                                  marginTop: '-4px',
                                }}>
                                  <div style={{ 
                                    fontSize: '1rem', 
                                    fontWeight: 'bold',
                                    lineHeight: '1',
                                    marginBottom: '0.2rem',
                                    textAlign: 'center',
                                    width: '100%',
                                  }}>
                                    {bid.level}
                                  </div>
                                  <div style={{ 
                                    fontSize: bid.suit === Suit.NO_TRUMP ? '0.9rem' : '1.2rem', 
                                    fontWeight: 'bold',
                                    lineHeight: '1',
                                    textAlign: 'center',
                                    width: '100%',
                                  }}>
                                    {suitSymbols[bid.suit]}
                                  </div>
                                </div>
                                {bid.alert && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    fontSize: '0.7rem',
                                    color: '#f90',
                                  }}>
                                    ⚠
                                  </div>
                                )}
                              </>
                            )}
                            {bid.bidType === BidType.DOUBLE && (
                              <>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '0px',
                                  marginTop: '-4px',
                                }}>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', lineHeight: '1' }}>X</div>
                                </div>
                                {bid.alert && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    fontSize: '0.7rem',
                                    color: '#f90',
                                  }}>
                                    ⚠
                                  </div>
                                )}
                              </>
                            )}
                            {bid.bidType === BidType.REDOUBLE && (
                              <>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '0px',
                                  marginTop: '-4px',
                                }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>X</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1' }}>X</div>
                                </div>
                                {bid.alert && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    fontSize: '0.7rem',
                                    color: '#f90',
                                  }}>
                                    ⚠
                                  </div>
                                )}
                              </>
                            )}
                            {bid.bidType === BidType.PASS && (
                              <>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  justifyContent: 'flex-start',
                                  paddingLeft: '0px',
                                  marginTop: '-4px',
                                }}>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>P</div>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>A</div>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>S</div>
                                  <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1' }}>S</div>
                                </div>
                                {bid.alert && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    fontSize: '0.7rem',
                                    color: '#f90',
                                  }}>
                                    ⚠
                                  </div>
                                )}
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              
              {/* Alert tooltip - displayed above the table */}
              {viewingAlertIndex !== null && bids[viewingAlertIndex]?.alert && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#333',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    zIndex: 1000,
                    maxWidth: '300px',
                    whiteSpace: 'normal',
                    textAlign: 'left',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Alert Meaning:</div>
                  <div>{bids[viewingAlertIndex].alert!.meaning}</div>
                </div>
              )}
            </div>
            )}

            {bids.length > 0 && (
              <button
                type="button"
                onClick={undoBid}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  border: '1px solid #c33',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'block',
                  margin: '1rem auto 0',
                }}
              >
                Undo Last Bid
              </button>
            )}
          </div>
        </div>

        {/* Right: Bid Selection */}
        <div className="question-editor-bid-selection">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Select Bid</h3>
          
          {/* Alert Editor Toggle */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: showAlertEditor ? '#f9f9f9' : '#fff' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: showAlertEditor ? '0.75rem' : '0' }}>
              <input
                type="checkbox"
                checked={showAlertEditor}
                onChange={(e) => {
                  setShowAlertEditor(e.target.checked)
                  if (!e.target.checked) {
                    setAlertMeaning('')
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Add Alert</span>
            </label>
            
            {showAlertEditor && (
              <>
                <label htmlFor="alert-meaning-textarea" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', marginTop: '0.75rem' }}>
                  Alert Meaning:
                </label>
                <textarea
                  id="alert-meaning-textarea"
                  value={alertMeaning}
                  onChange={(e) => setAlertMeaning(e.target.value)}
                  placeholder="Enter alert meaning"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                  }}
                />
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: '#666' }}>Insert Suit:</div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {suits.filter(suit => suit !== Suit.NO_TRUMP).map((suit) => (
                      <button
                        key={suit}
                        type="button"
                        onClick={() => insertSuitSymbol(suit)}
                        style={{
                          padding: '0.4rem 0.6rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          minWidth: '40px',
                        }}
                        title={suit === Suit.CLUB ? 'Club' : suit === Suit.DIAMOND ? 'Diamond' : suit === Suit.HEART ? 'Heart' : 'Spade'}
                      >
                        {suitSymbols[suit]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Pass, Double, Redouble - Fixed positions */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isPassAvailable && (
              <button
                type="button"
                onClick={() => handleBidWithAlert(BidType.PASS)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Pass
              </button>
            )}
            {isDoubleAvailable && (
              <button
                type="button"
                onClick={() => handleBidWithAlert(BidType.DOUBLE)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Double (X)
              </button>
            )}
            {isRedoubleAvailable && (
              <button
                type="button"
                onClick={() => handleBidWithAlert(BidType.REDOUBLE)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Redouble (XX)
              </button>
            )}
          </div>

          {/* Contract Bids - Two step selection */}
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#666' }}>
              Contract Bids
              {isAuctionEnded && <span style={{ color: '#d32f2f', marginLeft: '0.5rem' }}>(Auction Ended)</span>}
            </h4>
            
            {isAuctionEnded ? (
              <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                The auction has ended. No more bids can be added.
              </div>
            ) : !selectedLevel ? (
              // Step 1: Select Level
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {getAvailableLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLevelClick(level)}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            ) : (
              // Step 2: Select Suit
              <div>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '500' }}>Level {selectedLevel} - Choose Suit:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLevel(null)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                  {getAvailableSuits.map((suit) => (
                    <button
                      key={suit}
                      type="button"
                      onClick={() => handleSuitClick(suit)}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      {selectedLevel}{suitSymbols[suit]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Question Prompt */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="prompt" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Question Prompt *
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          placeholder="Enter the question prompt (this refers to the last bid in the auction)"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'inherit',
          }}
          disabled={loading}
        />
      </div>

      {/* Answer Type */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="answerType" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Answer Type *
        </label>
        <select
          id="answerType"
          value={availableAnswerTypes.includes(answerType) ? answerType : availableAnswerTypes[0] || answerType}
          onChange={(e) => {
            const newAnswerType = e.target.value as AnswerType
            setAnswerType(newAnswerType)
            
            // Initialize answer options based on answer type
            if (newAnswerType === AnswerType.DOUBLE_INTERPRETATION) {
              // If switching to double interpretation and no options exist, use defaults
              if (answerOptions.length === 0) {
                setAnswerOptions(['Penalty', 'Take-out', 'Values'])
              }
            } else if (newAnswerType === AnswerType.REDOUBLE_INTERPRETATION) {
              // If switching to redouble interpretation and no options exist, use defaults
              if (answerOptions.length === 0) {
                setAnswerOptions(['SOS', 'Extra values', 'To play'])
              }
            } else if (newAnswerType === AnswerType.MULTIPLE_CHOICE) {
              // If switching to multiple choice and no options exist, initialize with 2 empty options
              if (answerOptions.length === 0) {
                setAnswerOptions(['', ''])
              }
            } else {
              // Clear options for other answer types
              setAnswerOptions([])
            }
          }}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
          disabled={loading}
        >
          {availableAnswerTypes.map((at) => (
            <option key={at} value={at}>
              {at.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        {bids.length > 0 && !availableAnswerTypes.includes(answerType) && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#c33' }}>
            Current answer type is not valid for the last bid. Please select a valid option.
          </p>
        )}
      </div>

      {/* Answer Options */}
      {(answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION || answerType === AnswerType.REDOUBLE_INTERPRETATION) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Answer Options *
            {answerType === AnswerType.MULTIPLE_CHOICE && (
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
                (At least 2 required)
              </span>
            )}
            {answerType === AnswerType.DOUBLE_INTERPRETATION && (
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
                (Default: Penalty, Take-out, Values)
              </span>
            )}
            {answerType === AnswerType.REDOUBLE_INTERPRETATION && (
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
                (Default: SOS, Extra values, To play)
              </span>
            )}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {answerOptions.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...answerOptions]
                    newOptions[index] = e.target.value
                    setAnswerOptions(newOptions)
                  }}
                  placeholder={`Option ${index + 1}`}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = answerOptions.filter((_, i) => i !== index)
                    setAnswerOptions(newOptions)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                  disabled={loading || (answerType === AnswerType.MULTIPLE_CHOICE && answerOptions.length <= 2)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAnswerOptions([...answerOptions, ''])}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                alignSelf: 'flex-start',
              }}
              disabled={loading}
            >
              + Add Option
            </button>
          </div>
          {answerType === AnswerType.MULTIPLE_CHOICE && answerOptions.length < 2 && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#c33' }}>
              Multiple choice questions require at least 2 options.
            </p>
          )}
        </div>
      )}

      {/* Answer Type Info */}
      {answerType === AnswerType.FORCING_NON_FORCING && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Players will select: <strong>Forcing</strong> or <strong>Non-forcing</strong>
          </p>
        </div>
      )}
      {answerType === AnswerType.FREE_ANSWER && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Players will construct answers using UI buttons with: <strong>Intent</strong> (mandatory), <strong>Suit</strong> (optional), and <strong>Strength/HCP</strong> (optional)
          </p>
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving...' : questionId ? 'Update Question' : 'Create Question'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/quizzes/${quizId}/edit`)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
