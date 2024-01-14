import { Position, Range } from "./parser.js";
import * as p5 from "parse5";
import type * as p5t from "../../node_modules/parse5/dist/tree-adapters/default.js";

export function p5ToRange(location: p5.Token.Location): Range {
  return new Range(
    new Position(
      location.startLine - 1,
      location.startCol - 1,
      location.startOffset,
    ),
    new Position(location.endLine - 1, location.endCol - 1, location.endOffset),
  );
}

export function formatP5Error(error: p5.ParserError): string {
  switch (error.code) {
    case p5.ErrorCodes.controlCharacterInInputStream:
      return "Control character in input stream";
    case p5.ErrorCodes.noncharacterInInputStream:
      return "Noncharacter in input stream";
    case p5.ErrorCodes.surrogateInInputStream:
      return "Surrogate in input stream";
    case p5.ErrorCodes.nonVoidHtmlElementStartTagWithTrailingSolidus:
      return "Non-void HTML element tag cannot have a trailing solidus";
    case p5.ErrorCodes.endTagWithAttributes:
      return "End tag cannot have attributes";
    case p5.ErrorCodes.endTagWithTrailingSolidus:
      return "End tag cannot have a trailing solidus";
    case p5.ErrorCodes.unexpectedSolidusInTag:
      return "Unexpected solidus in tag";
    case p5.ErrorCodes.unexpectedNullCharacter:
      return "Unexpected null character in markup";
    case p5.ErrorCodes.unexpectedQuestionMarkInsteadOfTagName:
      return "Unexpected question mark instead of a tag name";
    case p5.ErrorCodes.invalidFirstCharacterOfTagName:
      return "Invalid first character in tag name";
    case p5.ErrorCodes.unexpectedEqualsSignBeforeAttributeName:
      return "Unexpected equals sign before attribute name";
    case p5.ErrorCodes.missingEndTagName:
      return "Missing end tag name";
    case p5.ErrorCodes.unexpectedCharacterInAttributeName:
      return "Unexpected character in attribute name";
    case p5.ErrorCodes.unknownNamedCharacterReference:
      return "Unknown named character reference";
    case p5.ErrorCodes.missingSemicolonAfterCharacterReference:
      return "Missing semicolon after character reference";
    case p5.ErrorCodes.unexpectedCharacterAfterDoctypeSystemIdentifier:
      return "Unexpected character after DOCTYPE system identifier";
    case p5.ErrorCodes.unexpectedCharacterInUnquotedAttributeValue:
      return "Unexpected character in unquoted attribute value";
    case p5.ErrorCodes.eofBeforeTagName:
      return "EOF before tag name could be determined";
    case p5.ErrorCodes.eofInTag:
      return "EOF encountered within a tag";
    case p5.ErrorCodes.missingAttributeValue:
      return "Missing attribute value";
    case p5.ErrorCodes.missingWhitespaceBetweenAttributes:
      return "Missing whitespace between attributes";
    case p5.ErrorCodes.missingWhitespaceAfterDoctypePublicKeyword:
      return "Missing whitespace after DOCTYPE public keyword";
    case p5.ErrorCodes
      .missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers:
      return "Missing whitespace between DOCTYPE public and system identifiers";
    case p5.ErrorCodes.missingWhitespaceAfterDoctypeSystemKeyword:
      return "Missing whitespace after DOCTYPE system keyword";
    case p5.ErrorCodes.missingQuoteBeforeDoctypePublicIdentifier:
      return "Missing quote before DOCTYPE public identifier";
    case p5.ErrorCodes.missingQuoteBeforeDoctypeSystemIdentifier:
      return "Missing quote before DOCTYPE system identifier";
    case p5.ErrorCodes.missingDoctypePublicIdentifier:
      return "Missing DOCTYPE public identifier";
    case p5.ErrorCodes.missingDoctypeSystemIdentifier:
      return "Missing DOCTYPE system identifier";
    case p5.ErrorCodes.abruptDoctypePublicIdentifier:
      return "Abrupt DOCTYPE public identifier";
    case p5.ErrorCodes.abruptDoctypeSystemIdentifier:
      return "Abrupt DOCTYPE system identifier";
    case p5.ErrorCodes.cdataInHtmlContent:
      return "CDATA sections are disallowed in HTML content";
    case p5.ErrorCodes.incorrectlyOpenedComment:
      return "Incorrectly opened comment";
    case p5.ErrorCodes.eofInScriptHtmlCommentLikeText:
      return "EOF in script HTML comment-like text";
    case p5.ErrorCodes.eofInDoctype:
      return "EOF in DOCTYPE";
    case p5.ErrorCodes.nestedComment:
      return "Nested comment encountered";
    case p5.ErrorCodes.abruptClosingOfEmptyComment:
      return "Abrupt closing of empty comment";
    case p5.ErrorCodes.eofInComment:
      return "EOF encountered in comment";
    case p5.ErrorCodes.incorrectlyClosedComment:
      return "Incorrectly closed comment";
    case p5.ErrorCodes.eofInCdata:
      return "EOF encountered in CDATA section";
    case p5.ErrorCodes.absenceOfDigitsInNumericCharacterReference:
      return "Absence of digits in numeric character reference";
    case p5.ErrorCodes.nullCharacterReference:
      return "Null character reference";
    case p5.ErrorCodes.surrogateCharacterReference:
      return "Surrogate character reference";
    case p5.ErrorCodes.characterReferenceOutsideUnicodeRange:
      return "Character reference outside Unicode range";
    case p5.ErrorCodes.controlCharacterReference:
      return "Control character reference";
    case p5.ErrorCodes.noncharacterCharacterReference:
      return "Noncharacter character reference";
    case p5.ErrorCodes.missingWhitespaceBeforeDoctypeName:
      return "Missing whitespace before DOCTYPE name";
    case p5.ErrorCodes.missingDoctypeName:
      return "Missing DOCTYPE name";
    case p5.ErrorCodes.invalidCharacterSequenceAfterDoctypeName:
      return "Invalid character sequence after DOCTYPE name";
    case p5.ErrorCodes.duplicateAttribute:
      return "Duplicate attribute";
    case p5.ErrorCodes.nonConformingDoctype:
      return "Non-conforming DOCTYPE";
    case p5.ErrorCodes.missingDoctype:
      return "Missing DOCTYPE";
    case p5.ErrorCodes.misplacedDoctype:
      return "Misplaced DOCTYPE";
    case p5.ErrorCodes.endTagWithoutMatchingOpenElement:
      return "End tag without matching open element";
    case p5.ErrorCodes.closingOfElementWithOpenChildElements:
      return "Closing of element with open child elements";
    case p5.ErrorCodes.disallowedContentInNoscriptInHead:
      return "Disallowed content in 'noscript' in 'head'";
    case p5.ErrorCodes.openElementsLeftAfterEof:
      return "Open elements left after EOF";
    case p5.ErrorCodes.abandonedHeadElementChild:
      return "Abandoned head element child";
    case p5.ErrorCodes.misplacedStartTagForHeadElement:
      return "Misplaced start tag for head element";
    case p5.ErrorCodes.nestedNoscriptInHead:
      return "Nested 'noscript' in 'head'";
    case p5.ErrorCodes.eofInElementThatCanContainOnlyText:
      return "EOF in element that can contain only text";
  }
}

export { p5, p5t };
