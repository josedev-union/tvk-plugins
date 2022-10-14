const { v4: uuidv4 } = require('uuid')

const SLACK_MESSAGE_INFO_TEMPLATE = ({infoJSON}) => `
*Info*
\`\`\`
${infoJSON}
\`\`\`
`.trim()

class SlackSimulationsClient {
  constructor({slack}) {
    this.slack = slack
  }

  async notifyResult({apiResults, channel, isLocal}) {
    const {clientId, simulationId, isSuccess, googleConsoleUrl, gsPath, mainImageNames, info} = apiResults
    const isLocalPrefix = isLocal ? '[LOCAL TEST] ' : ''
    const [stateDesc, stateEmoji] = isSuccess ? ['SUCCESS', ':white_check_mark:'] : ['FAILURE', ':x:']

    let imgObjects = apiResults.getImageFilesObject({onlyNames: mainImageNames})
    imgObjects = await apiResults.addImageUrls({imgObjects})
    const attachments = mainImageNames.map(name => {
      const {signedUrl: url, filename} = imgObjects[name]
      return {title: filename, image_url: url}
    })

    const infoMessage = SLACK_MESSAGE_INFO_TEMPLATE({
      infoJSON: JSON.stringify(info, null, 4),
    })
    const infoSection = {
      type: 'section',
        text: {type: 'mrkdwn', text: infoMessage},
    }
    const infoBlocks = isSuccess ? [] : [infoSection]

    const blocks = [
      {
        type: 'section',
        text: {type: 'mrkdwn', text: `<${googleConsoleUrl}|${gsPath}>`},
      },
      ...infoBlocks,
    ]
    const {ts: thread_ts} = await this.slack.chat.postMessage({
      channel,
      text: `${stateDesc} ${simulationId}`,
      attachments,
      blocks,
      icon_emoji: stateEmoji,
      username: `${isLocalPrefix}${stateDesc} ${simulationId}`,
      unfurl_links: false,
      unfurl_media: false,
      link_names: false,
    })
  }

  async addUploadImages(imgObjects, {simulationId}) {
    const uploadPromises = Object.values(imgObjects).map(imgObj => {
      const {filename, content} = imgObj
      return (async () => {
        const {file} = await this.slack.files.upload({
          title: `${filename} (${simulationId})`,
          filename,
          file: content,
          filetype: 'jpg',
        })
        imgObj.slackUrl = file.permalink_public
        return imgObj
      })()
    })
    return await Promise.all(uploadPromises)
  }

  async addRemoteFiles(imgObjects) {
    const remoteFilesPromises = Object.values(imgObjects).map(imgObj => {
      const {signedUrl: url, filename, name} = imgObj
      return (async () => {
        const {file: remoteFile} = await this.slack.files.remote.add({
          external_url: url,
          external_id: uuidv4(),
          title: filename,
          filetype: 'jpg',
          indexable_file_contents: `${simulationId} ${filename} ${name} `
        })
        imgObj.slackRemoteFile = remoteFile
        return imgObj
      })()
    })
    await Promise.all(remoteFilesPromises)
  }
}

exports.SlackSimulationsClient = SlackSimulationsClient
