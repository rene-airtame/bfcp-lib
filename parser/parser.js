const AttributeType = require('../attributes/type.js');
const FloorId = require('../attributes/floorId.js');
const SupportedAttributes = require('../attributes/supportedAttributes.js');
const SupportedPrimitives = require('../attributes/supportedPrimitives.js');
const FloorRequestStatusAtr = require('../attributes/floorRequestStatus.js');
const FloorRequestInformation = require('../attributes/floorRequestInformation.js');
const Primitive = require('../messages/primitive.js');
const CommonHeader = require('../messages/commonHeader.js');
const Hello = require('../messages/hello.js');
const HelloAck = require('../messages/helloAck.js');
const FloorRequest = require('../messages/floorRequest.js');
const FloorRequestStatusMsg = require('../messages/floorRequestStatus.js');

class Parser {
  static _parseCommonHeader(commonHeader) {
    let primitive = parseInt(commonHeader.substring(8, 16), 2);
    let payloadLength = parseInt(commonHeader.substring(16, 32), 2);
    let conferenceId = parseInt(commonHeader.substring(32, 64), 2);
    let transactionId = parseInt(commonHeader.substring(64, 80), 2);
    let userId = parseInt(commonHeader.substring(80, 96), 2);

    return new CommonHeader(primitive, payloadLength, conferenceId, transactionId, userId);
  }

  static _parseAttributes(attributes) {
    let attributeList = [];
    while(attributes != '') {
      let type = parseInt(attributes.substring(0, 7), 2);
      let length = parseInt(attributes.substring(8, 16), 2);
      let attribute = attributes.substring(0, length * 8);
      let content;

      switch(type) {
        case AttributeType.FloorId:
          content = Parser._parseFloorId(attribute.substring(16));
          attributeList.push(new FloorId(content));
          break;

        case AttributeType.SupportedAttributes:
          content = Parser._parseSupportedAttributes(attribute.substring(16));
          attributeList.push(new SupportedAttributes(content));
          break;

        case AttributeType.SupportedPrimitives:
          content = Parser._parseSupportedPrimitives(attribute.substring(16));
          attributeList.push(new SupportedPrimitives(content));
          break;

        case AttributeType.FloorRequestStatus:
          content = Parser._parseFloorRequestStatus(attribute.substring(16));
          attributeList.push(new FloorRequestStatusAtr(content));
          break;

        case AttributeType.FloorRequestInformation:
          content = Parser._parseFloorRequestInformation(attribute.substring(16));
          attributeList.push(new FloorRequestInformation(content.floorRequestId, content.floorId, content.requestStatus));
          break;

        case AttributeType.RequestStatus:
          content = Parser._parseRequestStatus(attribute.substring(16));
          attributeList.push(new RequestStatus(content.requestStatus, content.queuePosition));
          break;

        default:
          throw new Error('I cant parse this attribute!');
      }

      let size = length * 8;
      while(size % 32 != 0) {
        size = size + 8;
      }
      attributes = attributes.substring(size);
    }

    return attributeList;
  }

  static _parseFloorId(content) {
    return parseInt(content, 2);
  }

  static _parseSupportedAttributes(content) {
    let attributeTypes = [];
    for(let i = 1; i < (content.length / 8) + 1; i++) {
      let binType = content.substring(8 * (i - 1), 8 * i);
      attributeTypes.push(parseInt(binType.substring(0, 7), 2));
    }
    return attributeTypes;
  }

  static _parseSupportedPrimitives(content) {
    let primitives = [];
    for(let i = 1; i < (content.length / 8) + 1; i++) {
      let binPrimitive = content.substring(8 * (i - 1), 8 * i);
      primitives.push(parseInt(binPrimitive, 2));
    }
    return primitives;
  }

  static _parseFloorRequestStatus(content) {
    return parseInt(content, 2);
  }

  static _parseFloorRequestInformation(content) {
    let floorRequestId = parseInt(content.substring(0, 16), 2);
    let floorId = parseInt(content.substring(32, 48), 2);
    let requestStatus = parseInt(content.substring(64, 72), 2)
    return {
      'floorRequestId': floorRequestId,
      'floorId': floorId,
      'requestStatus': requestStatus
    }
  }

  static _parseRequestStatus(content) {
    let requestStatus = parseInt(content.substring(0, 8), 2);
    let queuePosition = parseInt(content.substring(8, 16), 2);
    return {
      'requestStatus': requestStatus,
      'queuePosition': queuePosition
    }
  }

  static parseMessage(message) {
    let binaryMessage = '';
    for (const value of message) {
      binaryMessage = binaryMessage + Parser.complementBinary(value.toString(2), 8);
    }
    let commonHeader = Parser._parseCommonHeader(binaryMessage.substring(0, 96));
    let attributes = Parser._parseAttributes(binaryMessage.substring(96));

    switch(commonHeader.primitive) {
      case Primitive.Hello:
        let hello = new Hello();
        hello.commonHeader = commonHeader;
        hello.attributes = attributes;
        return hello;

      case Primitive.HelloAck:
        let helloAck = new HelloAck();
        helloAck.commonHeader = commonHeader;
        helloAck.attributes = attributes;
        return helloAck;

      case Primitive.FloorRequest:
        let floorRequest = new FloorRequest();
        floorRequest.commonHeader = commonHeader;
        floorRequest.attributes = attributes;
        return floorRequest;

      case Primitive.FloorRequestStatus:
        let floorRequestStatus = new FloorRequestStatusMsg();
        floorRequestStatus.commonHeader = commonHeader;
        floorRequestStatus.attributes = attributes;
        return floorRequestStatus;
    }
  }

  static complementBinary(binary, length) {
    let complement = length - binary.length;
    if(complement <= 0) {
      return binary;
    }
    let complementString = '0'.repeat(complement);
    return complementString + binary;
  }
}

module.exports = Parser;