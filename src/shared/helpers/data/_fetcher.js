/**
 * MIT License
 *
 * Copyright (c) 2023 Jonathan Linat <https://github.com/jonathanlinat>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

module.exports = (shared) => {
  const constantsShared = shared.constants
  const dependenciesShared = shared.dependencies
  const helpersShared = shared.helpers

  const identifier = 'Fetcher'

  const cheerioDependencies = dependenciesShared.cheerio
  const crawlerConstants = constantsShared.crawler
  const fetcherConstants = constantsShared.fetcher
  const httpsDependencies = dependenciesShared.https
  const messageLoggerUtilsHelpers = helpersShared.utils.messageLogger(shared, {
    identifier
  })
  const nodeFetchDependencies = dependenciesShared.nodeFetch
  const setCacherDataHelpers = helpersShared.data.cacher.set(shared)
  const socksProxyAgentInstantiatorUtilsHelpers =
    helpersShared.utils.socksProxyAgentInstantiator(shared)
  const urlEncoderHelpers = helpersShared.utils.urlEncoder()
  const withQueryDependencies = dependenciesShared.withQuery

  const { inconclusiveResponses } = crawlerConstants
  const { maxRetries, retryDelay } = fetcherConstants

  const fetchData = async (args) => {
    const {
      documentType,
      documentReference,
      fetchOptions,
      recipeName,
      retryCount
    } = args

    const uppercasedDocumentType = documentType.toUpperCase()

    try {
      messageLoggerUtilsHelpers({
        level: 'info',
        message: `(${recipeName}) Fetching ${uppercasedDocumentType} document '${documentReference}'...`
      })

      const fetchedData = await nodeFetchDependencies(documentReference, {
        ...fetchOptions,
        agent: socksProxyAgentInstantiatorUtilsHelpers
      })
      const fetchedDataContent = await fetchedData.text()

      messageLoggerUtilsHelpers({
        level: 'info',
        message: `(${recipeName}) ${uppercasedDocumentType} document '${documentReference}' (${fetchedDataContent.length} bytes) fetched successfully`
      })

      return fetchedDataContent
    } catch (error) {
      if (retryCount >= maxRetries) {
        messageLoggerUtilsHelpers({
          level: 'error',
          message: `(${recipeName}) Despite ${maxRetries} attempts, fetching ${uppercasedDocumentType} document '${documentReference}' remained unsuccessful`
        })

        return null
      }

      const increasedRetryCount = retryCount + 1

      messageLoggerUtilsHelpers({
        level: 'info',
        message: `(${recipeName}) Retrying (${increasedRetryCount} of ${maxRetries}) to fetch ${uppercasedDocumentType} document '${documentReference}'...`
      })

      await new Promise((resolve) => setTimeout(resolve, retryDelay))

      const fetchedData = await fetchData({
        documentType,
        documentReference,
        fetchOptions,
        recipeName,
        retryCount: increasedRetryCount
      })

      return fetchedData
    }
  }

  return async (args) => {
    const { recipeName, documentType, pageType, path, params } = args

    const encodedPath = urlEncoderHelpers({ url: path })
    const httpsAgent = new httpsDependencies.Agent({
      rejectUnauthorized: false
    })

    const documentReference = withQueryDependencies(encodedPath, params)
    const fetchOptions = { agent: path.includes('https') && httpsAgent }

    const cacheKeyObject = { path, params }
    const cacheOptions = {
      recipeName,
      documentType,
      pageType,
      documentReference,
      cacheKeyObject
    }
    const cacheCallback = async () => {
      const retryCount = 0

      const fetchedData = await fetchData({
        documentType,
        documentReference,
        fetchOptions,
        recipeName,
        retryCount
      })

      return fetchedData
    }

    const cachedData = await setCacherDataHelpers({
      cacheOptions,
      callback: cacheCallback
    })

    const {
      response: cachedDataResponse,
      status: cachedDataStatus,
      ...restOfCachedData
    } = cachedData

    if (inconclusiveResponses.includes(cachedDataStatus)) {
      return cachedData
    }

    const loadedResponse = cheerioDependencies.load(cachedDataResponse)

    const fetcherResponse = {
      response: loadedResponse,
      status: cachedDataStatus,
      ...restOfCachedData
    }

    return fetcherResponse
  }
}
