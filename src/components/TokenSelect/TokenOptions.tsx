import { useLingui } from '@lingui/react'
import { Currency } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import useCurrencyBalance from 'hooks/useCurrencyBalance'
import useNativeEvent from 'hooks/useNativeEvent'
import useScrollbar from 'hooks/useScrollbar'
import {
  ComponentClass,
  CSSProperties,
  forwardRef,
  KeyboardEvent,
  memo,
  SyntheticEvent,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, FixedSizeList, FixedSizeListProps } from 'react-window'
import styled from 'styled-components/macro'
import { ThemedText } from 'theme'
import { currencyId } from 'utils/currencyId'
import { formatCurrencyAmount } from 'utils/formatCurrencyAmount'

import { BaseButton } from '../Button'
import Column from '../Column'
import Row from '../Row'
import TokenImg from '../TokenImg'

const TokenButton = styled(BaseButton)`
  border-radius: 0;
  outline: none;
  padding: 0.5em 0.75em;
`

const ITEM_SIZE = 56
type ItemData = Currency[]
interface FixedSizeTokenList extends FixedSizeList<ItemData>, ComponentClass<FixedSizeListProps<ItemData>> {}
const TokenList = styled(FixedSizeList as unknown as FixedSizeTokenList)<{
  hover: number
  scrollbar?: ReturnType<typeof useScrollbar>
}>`
  ${TokenButton}[data-index='${({ hover }) => hover}'] {
    background-color: ${({ theme }) => theme.onHover(theme.module)};
  }

  ${({ scrollbar }) => scrollbar}
  overscroll-behavior: none; // prevent Firefox's bouncy overscroll effect (because it does not trigger the scroll handler)
`
const OnHover = styled.div<{ hover: number }>`
  background-color: ${({ theme }) => theme.onHover(theme.module)};
  height: ${ITEM_SIZE}px;
  left: 0;
  position: absolute;
  top: ${({ hover }) => hover * ITEM_SIZE}px;
  width: 100%;
`

interface TokenOptionProps {
  index: number
  value: Currency
  style: CSSProperties
}

interface BubbledEvent extends SyntheticEvent {
  index?: number
  token?: Currency
  ref?: HTMLButtonElement
}

const TokenBalance = styled.div<{ isLoading: boolean }>`
  background-color: ${({ theme, isLoading }) => isLoading && theme.secondary};
  border-radius: 0.25em;
  padding: 0.375em 0;
`

function TokenOption({ index, value, style }: TokenOptionProps) {
  const { i18n } = useLingui()
  const ref = useRef<HTMLButtonElement>(null)
  // Annotate the event to be handled later instead of passing in handlers to avoid rerenders.
  // This prevents token logos from reloading and flashing on the screen.
  const onEvent = (e: BubbledEvent) => {
    e.index = index
    e.token = value
    e.ref = ref.current ?? undefined
  }

  const { account } = useWeb3React()
  const balance = useCurrencyBalance(account, value)

  return (
    <TokenButton
      data-index={index}
      style={style}
      onClick={onEvent}
      onBlur={onEvent}
      onFocus={onEvent}
      onMouseMove={onEvent}
      onKeyDown={onEvent}
      ref={ref}
    >
      <ThemedText.Body1>
        <Row>
          <Row gap={0.5}>
            <TokenImg token={value} size={1.5} />
            <Column flex gap={0.125} align="flex-start">
              <ThemedText.Subhead1>{value.symbol}</ThemedText.Subhead1>
              <ThemedText.Caption color="secondary">{value.name}</ThemedText.Caption>
            </Column>
          </Row>
          <TokenBalance isLoading={Boolean(account) && !balance}>
            {balance?.greaterThan(0) && formatCurrencyAmount(balance, 4, i18n.locale)}
          </TokenBalance>
        </Row>
      </ThemedText.Body1>
    </TokenButton>
  )
}

const itemKey = (index: number, tokens: ItemData) => currencyId(tokens[index])
const ItemRow = memo(function ItemRow({
  data: tokens,
  index,
  style,
}: {
  data: ItemData
  index: number
  style: CSSProperties
}) {
  return <TokenOption index={index} value={tokens[index]} style={style} />
},
areEqual)

interface TokenOptionsHandle {
  onKeyDown: (e: KeyboardEvent) => void
  blur: () => void
}

interface TokenOptionsProps {
  tokens: Currency[]
  onSelect: (token: Currency) => void
}

const TokenOptions = forwardRef<TokenOptionsHandle, TokenOptionsProps>(function TokenOptions(
  { tokens, onSelect }: TokenOptionsProps,
  ref
) {
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState<Currency>()
  const hover = useMemo(() => (selected ? tokens.indexOf(selected) : -1), [selected, tokens])

  const list = useRef<FixedSizeList>(null)
  const [element, setElement] = useState<HTMLElement | null>(null)

  const scrollTo = useCallback(
    (index: number | undefined, scroll = true) => {
      if (index === undefined) return
      if (scroll) {
        list.current?.scrollToItem(index)
      }
      if (focused) {
        element?.querySelector<HTMLElement>(`[data-index='${index}']`)?.focus()
      }
      setSelected(tokens[index])
    },
    [element, focused, tokens]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (e.key === 'ArrowDown' && hover < tokens.length - 1) {
          scrollTo(hover + 1)
        } else if (e.key === 'ArrowUp' && hover > 0) {
          scrollTo(hover - 1)
        } else if (e.key === 'ArrowUp' && hover === -1) {
          scrollTo(tokens.length - 1)
        }
        e.preventDefault()
      }
      if (e.key === 'Enter' && hover !== -1) {
        onSelect(tokens[hover])
      }
    },
    [hover, onSelect, scrollTo, tokens]
  )
  const blur = useCallback(() => setSelected(undefined), [])
  useImperativeHandle(ref, () => ({ onKeyDown, blur }), [blur, onKeyDown])

  const onClick = useCallback(({ token }: BubbledEvent) => token && onSelect(token), [onSelect])
  const onFocus = useCallback(
    ({ index }: BubbledEvent) => {
      setFocused(true)
      scrollTo(index)
    },
    [scrollTo]
  )
  const onBlur = useCallback(() => setFocused(false), [])
  const onMouseMove = useCallback(({ index }: BubbledEvent) => scrollTo(index, false), [scrollTo])

  const scrollbar = useScrollbar(element, { padded: true })
  const onHover = useRef<HTMLDivElement>(null)
  // use native onscroll handler to capture Safari's bouncy overscroll effect
  useNativeEvent(
    element,
    'scroll',
    useCallback(() => {
      if (element && onHover.current) {
        // must be set synchronously to avoid jank (avoiding useState)
        onHover.current.style.marginTop = `${-element.scrollTop}px`
      }
    }, [element])
  )

  return (
    <Column
      align="unset"
      grow
      onKeyDown={onKeyDown}
      onClick={onClick}
      onBlur={onBlur}
      onFocus={onFocus}
      onMouseMove={onMouseMove}
      style={{ overflow: 'hidden' }}
    >
      {/* OnHover is a workaround to Safari's incorrect (overflow: overlay) implementation */}
      <OnHover hover={hover} ref={onHover} />
      <AutoSizer disableWidth>
        {({ height }) => (
          <TokenList
            hover={hover}
            height={height}
            width="100%"
            itemCount={tokens.length}
            itemData={tokens}
            itemKey={itemKey}
            itemSize={ITEM_SIZE}
            className="scrollbar"
            ref={list}
            outerRef={setElement}
            scrollbar={scrollbar}
          >
            {ItemRow}
          </TokenList>
        )}
      </AutoSizer>
    </Column>
  )
})

export default TokenOptions
