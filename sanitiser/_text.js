var check = require('check-types'),
    text_analyzer = require('pelias-text-analyzer');

/**
 * Author of original script: Artak Harutyunyan
 * Modified for needs of @MobiTaxi needs
 *
 * @copyright Artak Harutyunyan <Harutyunyan.Artak[at]gmail.com>
 * @link http://hayeren.am
 */
var inOneCharLetters = 'ABGDEZILXKHMYNOPJSVWTRCQFabgdez@ilx$kh&mynopjsvwtrcqf?';
var outOneCharLetters = 'ԱԲԳԴԵԶԻԼԽԿՀՄՅՆՈՊՋՍՎՎՏՐՑՔՖաբգդեզըիլխծկհճմյնոպջսվվտրցքֆ՞';
var inTwoCharLetters = 'YEYeE\'EEEeY\'@@THThZHZhJHJhKHKhC\'TSTsD\'DZDzGHGhTWTw&&SHShVOVoCHChR\'RRRrP\'PHPhO\'OO' +
    'Ooyee\'eey\'thzhjhkhc\'tsd\'dzghtwshvochr\'rrp\'phevo\'oo';
var outTwoCharLetters = 'ԵԵԷԷԷԸԸԹԹԺԺԺԺԽԽԾԾԾՁՁՁՂՂՃՃՃՇՇՈՈՉՉՌՌՌՓՓՓՕՕՕեէէըթժժխծծձձղճշոչռռփփևօօ';
var inThreeCharLetters = 'Uu';
var outThreeCharLetters = 'Ուու';

function translit(inString) {
    var inStringLength = inString.length;
    var outString = '';

    var i, j, is2char, pos;

    for (i = 0; i < inStringLength; i++) {
        is2char = false;
        if (i < inStringLength - 1) {
            for (j = 0; j < outTwoCharLetters.length; j++) {
                if (inString.substr(i, 2) === inTwoCharLetters.substr(j * 2, 2)) {
                    outString += outTwoCharLetters.substr(j, 1);
                    i++;
                    is2char = true;
                    break;
                }
            }
        }

        if (!is2char) {
            var currentCharacter = inString.substr(i, 1);

            pos = inThreeCharLetters.indexOf(currentCharacter);
            if (pos < 0) {
                pos = inOneCharLetters.indexOf(currentCharacter);

                if (pos < 0) {
                    outString += currentCharacter;
                }
                else {
                    outString += outOneCharLetters.substr(pos, 1);
                }
            }
            else {
                outString += outThreeCharLetters.substr(pos * 2, 2);
            }
        }
    }
    return outString;
}

// validate texts, convert types and apply defaults
function sanitize(raw, clean) {

    // error & warning messages
    var messages = {errors: [], warnings: []};

    // invalid input 'text'
    if (!check.nonEmptyString(raw.text)) {
        messages.errors.push('invalid param \'text\': text length, must be >0');
    }

    // valid input 'text'
    else {

        // Process some texts for Armenian Language support
        // Will be removed when OSM does support english locality names
        var convertedText = raw.text;

        // So, first of, convert whole text to lowercase
        convertedText = convertedText.toLocaleLowerCase();

        // Convert 'street' to 'փողոց'
        convertedText = convertedText.replace('street', 'փողոց');
        convertedText = convertedText.replace('str', 'փողոց');

        // Convert "Armenia" to "Հայաստան"
        convertedText = convertedText.replace('armenia', 'հայաստան');

        // Translit script
        convertedText = translit(convertedText);

        // valid text
        clean.text = convertedText;

        // parse text with query parser
        var parsed_text = text_analyzer.parse(clean.text);
        if (check.assigned(parsed_text)) {
            clean.parsed_text = parsed_text;
        }
    }

    return messages;
}

// export function
module.exports = sanitize;
