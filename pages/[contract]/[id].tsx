import {
  faArrowLeft,
  faCircleExclamation,
  faRefresh,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { paths } from '@reservoir0x/reservoir-kit-client'
import {
  TokenMedia,
  useCollections,
  useTokenOpenseaBanned,
  useTokens,
  useUserTokens,
} from '@reservoir0x/reservoir-kit-ui'
import Layout from 'components/Layout'
import {
  Flex,
  Text,
  Button,
  Tooltip,
  Anchor,
  Grid,
} from 'components/primitives'
import { TabsList, TabsTrigger, TabsContent } from 'components/primitives/Tab'
import * as Tabs from '@radix-ui/react-tabs'
import AttributeCard from 'components/token/AttributeCard'
import { PriceData } from 'components/token/PriceData'
import RarityRank from 'components/token/RarityRank'
import { TokenActions } from 'components/token/TokenActions'
import {
  GetStaticProps,
  GetStaticPaths,
  InferGetStaticPropsType,
  NextPage,
} from 'next'
import Link from 'next/link'
import { jsNumberForAddress } from 'react-jazzicon'
import Jazzicon from 'react-jazzicon/dist/Jazzicon'
import fetcher from 'utils/fetcher'
import { truncateAddress } from 'utils/truncate'
import { useAccount } from 'wagmi'
import { TokenInfo } from 'components/token/TokenInfo'

type Props = InferGetStaticPropsType<typeof getStaticProps>

const IndexPage: NextPage<Props> = ({ id, collectionId, ssr }) => {
  const account = useAccount()
  const { data: collections } = useCollections(
    {
      id: collectionId,
    },
    {
      fallback: ssr.collection,
    }
  )
  const collection = collections && collections[0] ? collections[0] : null

  const { data: tokens, mutate } = useTokens(
    {
      tokens: [`${collectionId}:${id}`],
      includeAttributes: true,
      includeTopBid: true,
    },
    {
      fallback: ssr.tokens,
    }
  )
  const flagged = useTokenOpenseaBanned(collectionId, id)
  const token = tokens && tokens[0] ? tokens[0] : undefined
  const checkUserOwnership = token?.token?.kind === 'erc1155'

  const { data: userTokens } = useUserTokens(
    checkUserOwnership ? account.address : undefined,
    {
      tokens: [`${collectionId}:${id}`],
    }
  )

  const isOwner =
    userTokens &&
    userTokens[0] &&
    userTokens[0].ownership?.tokenCount &&
    +userTokens[0].ownership.tokenCount > 0
      ? true
      : token?.token?.owner?.toLowerCase() === account?.address?.toLowerCase()
  const owner = isOwner ? account?.address : token?.token?.owner
  const ownerFormatted = isOwner
    ? 'You'
    : truncateAddress(token?.token?.owner || '')

  return (
    <Layout>
      <Flex
        justify="center"
        css={{
          maxWidth: 1175,
          marginTop: 48,
          marginLeft: 'auto',
          marginRight: 'auto',
          gap: 80,
        }}
      >
        <Flex direction="column" css={{ maxWidth: 445, flex: 1 }}>
          <TokenMedia
            token={token?.token}
            style={{
              width: '100%',
              height: 'auto',
              minHeight: 445,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          />
          {token?.token?.attributes && (
            <Grid css={{ gridTemplateColumns: '1fr 1fr', gap: '$3', mt: 24 }}>
              {token?.token?.attributes?.map((attribute) => (
                <AttributeCard
                  key={attribute.key}
                  attribute={attribute}
                  collectionTokenCount={collection?.tokenCount || 0}
                  collectionId={collection?.id}
                />
              ))}
            </Grid>
          )}
        </Flex>
        <Flex direction="column" css={{ flex: 1 }}>
          <Flex justify="between" align="center" css={{ mb: 20 }}>
            <Link href={`/collections/${collectionId}`} legacyBehavior={true}>
              <Anchor
                color="primary"
                css={{ display: 'flex', alignItems: 'center', gap: '$2' }}
              >
                <FontAwesomeIcon icon={faArrowLeft} height={16} />
                <Text css={{ color: 'inherit' }} style="subtitle1">
                  {collection?.name}
                </Text>
              </Anchor>
            </Link>
            <Button
              onClick={() => {
                fetcher('tokens/refresh/v1', undefined, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ token: `${collectionId}:${id}` }),
                })
                  .then(({ response }) => {
                    if (response.status === 200) {
                      //TODO show toast
                    }
                    throw 'Request Failed'
                  })
                  .catch((e) => {
                    //TODO show toast error
                    throw e
                  })
              }}
              color="gray3"
              size="xs"
            >
              <FontAwesomeIcon icon={faRefresh} width={16} height={16} />
            </Button>
          </Flex>
          <Flex align="center" css={{ gap: '$2' }}>
            <Text style="h4">{token?.token?.name}</Text>
            {flagged && (
              <Tooltip
                content={<Text style="body2">Not tradeable on OpenSea</Text>}
              >
                <Text css={{ color: '$red10' }}>
                  <FontAwesomeIcon
                    icon={faCircleExclamation}
                    width={16}
                    height={16}
                  />
                </Text>
              </Tooltip>
            )}
          </Flex>
          {token && (
            <>
              <Flex align="center" css={{ mt: '$2' }}>
                <Text style="subtitle3" css={{ color: '$gray11', mr: '$2' }}>
                  Owner
                </Text>
                <Jazzicon
                  diameter={16}
                  seed={jsNumberForAddress(owner || '')}
                />
                <Link href={`/portfolio/${owner}`} legacyBehavior={true}>
                  <Anchor color="primary" weight="normal" css={{ ml: '$1' }}>
                    {ownerFormatted}
                  </Anchor>
                </Link>
              </Flex>
              {/* TODO: pass collection attributes */}
              <RarityRank token={token} collection={collection} />
              <PriceData token={token} />
              <TokenActions token={token} isOwner={isOwner} mutate={mutate} />
              <Tabs.Root defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                  {collection && (
                    <TokenInfo token={token} collection={collection} />
                  )}
                </TabsContent>
              </Tabs.Root>
            </>
          )}
        </Flex>
      </Flex>
    </Layout>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps<{
  id?: string
  collectionId?: string
  ssr: {
    collection: paths['/collections/v5']['get']['responses']['200']['schema']
    tokens: paths['/tokens/v5']['get']['responses']['200']['schema']
  }
}> = async ({ params }) => {
  const collectionId = params?.contract?.toString()
  const id = params?.id?.toString()

  let collectionQuery: paths['/collections/v5']['get']['parameters']['query'] =
    {
      id: collectionId,
      includeTopBid: true,
    }

  const collectionsResponse = await fetcher('/collectins/v5', collectionQuery)
  const collection: Props['ssr']['collection'] = collectionsResponse['data']

  let tokensQuery: paths['/tokens/v5']['get']['parameters']['query'] = {
    tokens: [`${collectionId}:${id}`],
    sortBy: 'floorAskPrice',
    includeTopBid: false,
    limit: 20,
  }

  const tokensResponse = await fetcher('/tokens/v5', tokensQuery)

  const tokens: Props['ssr']['tokens'] = tokensResponse['data']

  return {
    props: { collectionId, id, ssr: { collection, tokens } },
    revalidate: 20,
  }
}

export default IndexPage