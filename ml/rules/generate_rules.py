import json
import os

rules = []
coverage = []

def add_rule(rid, section, name, desc, sev, clause, verified, hint, ex_fail, ex_pass, chunk, implemented=True, notes=""):
    if implemented:
        rules.append({
            "rule_id": rid,
            "section": section,
            "name": name,
            "description": desc,
            "severity": sev,
            "source_clause": clause,
            "source_clause_verified": verified,
            "detection_hint": hint,
            "examples_fail": ex_fail,
            "examples_pass": ex_pass,
            "retrieval_chunk": chunk
        })
    coverage.append(f"| {name} | {rid if implemented else 'N/A'} | {'Yes' if implemented else 'No'} | {'Yes' if verified else 'No'} | {notes} |")

# Generic Words
add_rule("R-GEN-01", "Guideline 1", "Generic or root word titles", "Generic, or root word titles shall not be registered.", "CRITICAL",
         "Generic, or root word titles shall not be registered.", True, "length/word count = 1 and in generic word list", ["Manthan", "Success"], ["Daily Manthan", "Success Times"],
         "The proposed titles should preferably contain more than one word formed by combining distinct and meaningful terms. Generic, or root word titles shall not be registered.")
add_rule("R-GEN-02", "Guideline 1", "Single word distinct terms", "Titles must preferably contain more than one word.", "WARNING",
         "The proposed titles should preferably contain more than one word formed by combining distinct and meaningful terms.", True, "word count == 1", ["Katha", "Herald"], ["Morning Katha", "National Herald News"],
         "The proposed titles should preferably contain more than one word formed by combining distinct and meaningful terms.")

# Phonetic / Visual
add_rule("R-DUP-01", "Guideline 2", "Phonetic similarity", "Titles must not be phonetically similar to existing registered titles.", "CRITICAL",
         "The proposed titles must be unique and shall not be phonetically or visually similar to any existing registered title", True, "phonetic similarity score > threshold", ["Times of Indya"], ["Mumbai Tribune"],
         "The proposed titles must be unique and shall not be phonetically or visually similar to any existing registered title whether in the same language across India or any other language within the same State.")
add_rule("R-DUP-02", "Guideline 2", "Visual similarity", "Titles must not be visually similar to existing registered titles.", "CRITICAL",
         "The proposed titles must be unique and shall not be phonetically or visually similar to any existing registered title", True, "visual/edit distance similarity > threshold", ["Timess of India"], ["Mumbai Tribune"],
         "The proposed titles must be unique and shall not be phonetically or visually similar to any existing registered title whether in the same language across India or any other language within the same State.")

# Meaningful / Negative / Obscene
add_rule("R-DEC-01", "Guideline 3", "Negative religious connotations", "Titles with negative connotations with religious sentiments will not be registered.", "CRITICAL",
         "Titles with negative connotations with religious sentiments... will not be registered.", True, "religious dictionary + negative sentiment", ["Anti-Faith News"], ["Religious Harmony Review"],
         "Titles should be meaningful and clear. Titles with negative connotations with religious sentiments, obscene, absurd or offensive to public sentiments or those that could be misused with words like “crime”, “corruption” etc. will not be registered.")
add_rule("R-DEC-02", "Guideline 3", "Obscene titles", "Obscene titles will not be registered.", "CRITICAL",
         "Titles with negative connotations... obscene, absurd or offensive to public sentiments... will not be registered.", True, "obscenity dictionary matching", ["Adult XXx Magazine"], ["Healthy Living"],
         "Titles should be meaningful and clear. Titles with negative connotations with religious sentiments, obscene, absurd or offensive to public sentiments or those that could be misused with words like “crime”, “corruption” etc. will not be registered.")
add_rule("R-DEC-03", "Guideline 3", "Absurd or offensive titles", "Absurd or offensive titles to public sentiments will not be registered.", "CRITICAL",
         "Titles with negative connotations... obscene, absurd or offensive to public sentiments... will not be registered.", True, "offensive keywords", ["Stupid People News"], ["Smart People Daily"],
         "Titles should be meaningful and clear. Titles with negative connotations with religious sentiments, obscene, absurd or offensive to public sentiments or those that could be misused with words like “crime”, “corruption” etc. will not be registered.")
add_rule("R-DEC-04", "Guideline 3", "Misuse of crime words", "Titles that could be misused with words like “crime”, “corruption” etc. will not be registered.", "CRITICAL",
         "Titles... that could be misused with words like “crime”, “corruption” etc. will not be registered.", True, "crime/corruption keywords", ["Corruption Daily", "Crime Times"], ["Law and Order Review"],
         "Titles should be meaningful and clear. Titles with negative connotations with religious sentiments, obscene, absurd or offensive to public sentiments or those that could be misused with words like “crime”, “corruption” etc. will not be registered.")

# Abbreviations
add_rule("R-LEN-01", "Guideline 4", "Abbreviations and acronyms", "Abbreviations, acronyms or numerals will be considered only if meaningfully attached with other words.", "WARNING",
         "Abbreviations, acronyms or numerals will be considered only if they are meaningfully and appropriately attached with other words.", True, "title is only abbreviations", ["IBM", "ABC"], ["ABC Technology Review"],
         "Abbreviations, acronyms or numerals will be considered only if they are meaningfully and appropriately attached with other words.")
add_rule("R-NUM-01", "Guideline 4", "Numerals", "Numerals will be considered only if they are meaningfully attached with other words.", "CRITICAL",
         "Abbreviations, acronyms or numerals will be considered only if they are meaningfully and appropriately attached with other words.", True, "title is purely numeric", ["12345", "2026"], ["2026 Sports Review"],
         "Abbreviations, acronyms or numerals will be considered only if they are meaningfully and appropriately attached with other words.")

# Rearranging
add_rule("R-DUP-03", "Guideline 5", "Combining full existing titles", "Titles combining existing registered titles in full will not be registered.", "CRITICAL",
         "Titles that combine existing registered titles whether in full, in part or by rearranging words... will not be registered.", True, "full inclusion of existing title", ["The Hindu Times"], ["New Global Horizon"],
         "Titles that combine existing registered titles whether in full, in part or by rearranging words or inserting non-distinctive terms that do not create a significantly different title will not be registered.")
add_rule("R-DUP-04", "Guideline 5", "Rearranging existing titles", "Titles combining existing registered titles by rearranging words will not be registered.", "CRITICAL",
         "Titles that combine existing registered titles whether in full, in part or by rearranging words... will not be registered.", True, "bag of words match with existing", ["Times The"], ["Global Tech View"],
         "Titles that combine existing registered titles whether in full, in part or by rearranging words or inserting non-distinctive terms that do not create a significantly different title will not be registered.")
add_rule("R-DUP-05", "Guideline 5", "Inserting non-distinctive terms", "Titles combining existing registered titles by inserting non-distinctive terms will not be registered.", "CRITICAL",
         "Titles that combine existing registered titles... by inserting non-distinctive terms that do not create a significantly different title will not be registered.", True, "stopword removal match", ["The Real Times"], ["Real Estate Today"],
         "Titles that combine existing registered titles whether in full, in part or by rearranging words or inserting non-distinctive terms that do not create a significantly different title will not be registered.")

# Personal name
add_rule("R-PER-01", "Guideline 6", "Owner/Publisher name", "Titles denoting the name of an individual should not be the names of the owner or publisher.", "CRITICAL",
         "Titles denoting the name of an individual should not be the names of the owner or publisher of the proposed periodical.", True, "name match with applicant", ["Rajan Times"], ["National Times"],
         "Titles denoting the name of an individual should not be the names of the owner or publisher of the proposed periodical. (Example: \"Rajan Times\", \"Deepak Samachar\", \"Jitendra News\", etc.).")

# Symbols
add_rule("R-SYM-01", "Guideline 7", "Non-text characters", "Titles containing non-text characters, signs, symbols, emojis, etc. will not be registered.", "CRITICAL",
         "Titles containing non-text characters, or any form of signs, symbols including mathematical symbols... emojis, etc.", True, "regex non-alphanumeric", ["@#*! News", "Tech+Review"], ["Tech Review"],
         "Titles containing non-text characters, or any form of signs, symbols including mathematical symbols(like \"+\", \"*\", etc.), pictographs, photographs, hallmarks, logos, monograms, phonograms, emojis, etc.")
add_rule("R-SYM-02", "Guideline 7", "Mathematical symbols", "Titles containing mathematical symbols will not be registered.", "CRITICAL",
         "Titles containing non-text characters, or any form of signs, symbols including mathematical symbols...", True, "regex math symbols", ["A+ Grade News"], ["A Grade News"],
         "Titles containing non-text characters, or any form of signs, symbols including mathematical symbols(like \"+\", \"*\", etc.), pictographs, photographs, hallmarks, logos, monograms, phonograms, emojis, etc.")

# Generic Suffix/Prefix
add_rule("R-GEN-03", "Guideline 8", "Prefixing generic terms", "Titles formed by insignificantly prefixing generic or repetitive terms to an existing title will not be approved.", "CRITICAL",
         "Titles formed by insignificantly prefixing or suffixing generic or repetitive terms to an existing title... will not be approved.", True, "existing title + generic prefix", ["Daily Times"], ["Daily Independent Voice"],
         "Titles formed by insignificantly prefixing or suffixing generic or repetitive terms to an existing title... will not be approved.")
add_rule("R-GEN-04", "Guideline 8", "Suffixing generic terms", "Titles formed by insignificantly suffixing generic or repetitive terms to an existing title will not be approved.", "CRITICAL",
         "Titles formed by insignificantly prefixing or suffixing generic or repetitive terms to an existing title... will not be approved.", True, "existing title + generic suffix", ["Times Daily"], ["Independent Voice Daily"],
         "Titles formed by insignificantly prefixing or suffixing generic or repetitive terms to an existing title... will not be approved.")
add_rule("R-GEN-05", "Guideline 8", "Addition of cities/states", "Titles formed by adding names of cities or states to an existing title will not be approved.", "CRITICAL",
         "Titles formed by insignificantly prefixing or suffixing... such as addition names of cities or states... will not be approved.", True, "existing title + city/state", ["Delhi Times"], ["Delhi Heritage Magazine"],
         "Titles formed by insignificantly prefixing or suffixing generic or repetitive terms to an existing title- such as addition names of cities or states... will not be approved.")

# Judicial / Infringement
add_rule("R-LEG-01", "Guideline 9", "Copyright infringement", "Titles in violation of copyright will not be registered.", "CRITICAL",
         "The proposed title shall not be registered if it is found to be in violation of any judicial pronouncement including matters involving copyright...", True, "copyright db check", ["Disney News"], ["Local Kids News"],
         "The proposed title shall not be registered if it is found to be in violation of any judicial pronouncement including matters involving copyright, trademark infringement, contempt of court and defamation.")
add_rule("R-LEG-02", "Guideline 9", "Trademark infringement", "Titles in violation of trademark infringement will not be registered.", "CRITICAL",
         "The proposed title shall not be registered if it is found to be in violation of any judicial pronouncement including matters involving... trademark infringement...", True, "trademark db check", ["Nike Daily"], ["Shoe Market Review"],
         "The proposed title shall not be registered if it is found to be in violation of any judicial pronouncement including matters involving copyright, trademark infringement, contempt of court and defamation.")
add_rule("R-LEG-03", "Guideline 9", "Defamation", "Titles in violation of judicial pronouncement involving defamation will not be registered.", "CRITICAL",
         "The proposed title shall not be registered if it is found to be in violation of any judicial pronouncement including matters involving... defamation.", True, "defamatory keyword check", ["Fraudster John News"], ["Honest Civic News"],
         "The proposed title shall not be registered if it is found to be in violation of any judicial pronouncement including matters involving copyright, trademark infringement, contempt of court and defamation.")

# Sovereignty / Decency
add_rule("R-GOV-02", "Guideline 10", "Affecting sovereignty", "Titles containing words affecting the sovereignty and integrity of India will not be registered.", "CRITICAL",
         "Titles containing words which can be construed as affecting the sovereignty and integrity of India... will not be registered.", True, "sovereignty keywords", ["Break India News"], ["United India Review"],
         "Titles containing words which can be construed as affecting the sovereignty and integrity of India, Security of the State, International Relations, Public order, Morality and public decency, incite unrest or disorder etc.will not be registered.")
add_rule("R-GOV-03", "Guideline 10", "Security of the State", "Titles containing words affecting the Security of the State will not be registered.", "CRITICAL",
         "Titles containing words which can be construed as affecting the... Security of the State... will not be registered.", True, "security risk keywords", ["State Attack Daily"], ["State Defense Review"],
         "Titles containing words which can be construed as affecting the sovereignty and integrity of India, Security of the State, International Relations, Public order, Morality and public decency, incite unrest or disorder etc.will not be registered.")
add_rule("R-GOV-04", "Guideline 10", "Incite unrest", "Titles containing words that incite unrest or disorder will not be registered.", "CRITICAL",
         "Titles containing words which can be construed as affecting... incite unrest or disorder etc.will not be registered.", True, "unrest/riot keywords", ["Riot News"], ["Peace Chronicle"],
         "Titles containing words which can be construed as affecting the sovereignty and integrity of India, Security of the State, International Relations, Public order, Morality and public decency, incite unrest or disorder etc.will not be registered.")

# Emblems Act
add_rule("R-EMB-01", "Guideline 11", "National symbols", "Titles similar to any national symbol will not be registered.", "CRITICAL",
         "Titles similar to any national symbol... will not be registered.", True, "national symbol dictionary", ["Ashoka Chakra News"], ["Indian Heritage Review"],
         "Titles similar to any national symbol, national motto, or suggesting misleading association with Central Government... will not be registered.")
add_rule("R-EMB-02", "Guideline 11", "National motto", "Titles similar to any national motto will not be registered.", "CRITICAL",
         "Titles similar to any... national motto... will not be registered.", True, "motto check", ["Satyameva Jayate Times"], ["Truthful Times"],
         "Titles similar to any national symbol, national motto, or suggesting misleading association with Central Government... will not be registered.")
add_rule("R-EMB-03", "Guideline 11", "Emblems Act violation", "Titles violative of The Emblems and Names (Prevention of Improper Use) Act, 1950 will not be registered.", "CRITICAL",
         "Titles... violative of \"The Emblems and Names (Prevention of Improper Use) Act, 1950” or any other law in force will not be registered.", True, "Emblems act wordlist", ["President of India News"], ["National Civic News"],
         "Titles similar to any national symbol, national motto, or suggesting misleading association with Central Government/State Governments/Local bodies/Constitutional bodies/Statutory bodies or are violative of \"The Emblems and Names (Prevention of Improper Use) Act, 1950” or any other law in force will not be registered.")

# Government Agencies
add_rule("R-GOV-05", "Guideline 12", "Government Organizations", "Titles containing names of Government Organizations/Departments will not be registered.", "CRITICAL",
         "Titles containing names of Government Organizations/Departments... shall not be registered.", True, "government dept dictionary", ["Police Times", "CBI News"], ["Civic Guardian"],
         "Titles containing names of Government Organizations/Departments, Regulatory/Enforcement Agencies (such as \"Police\", \"Bureau\"... shall not be registered.")
add_rule("R-GOV-06", "Guideline 12", "International Organizations", "Titles containing names of International Organizations will not be registered.", "CRITICAL",
         "Titles containing names of... International Organizations (e.g., UN, WHO, ILO) in any language... shall not be registered.", True, "international org dictionary", ["UN Daily", "WHO Medical Review"], ["Global Medical Review"],
         "Titles containing names of... International Organizations (e.g., UN, WHO, ILO) in any language... shall not be registered.")
add_rule("R-GOV-07", "Guideline 12", "Public welfare schemes", "Titles containing names of public welfare schemes of Central/State Governments will not be registered.", "CRITICAL",
         "title containing the names of public welfare schemes of Central/State Governments... shall not be registered.", True, "welfare scheme dictionary", ["PM Kisan News"], ["Farming Today"],
         "title containing the names of public welfare schemes of Central/State Governments or its organizations or local bodies which suggest a misleading association with them shall not be registered.")

# Foreign location
add_rule("R-LOC-01", "Guideline 13", "Foreign country/city", "Titles suggesting association with a foreign country, city, or place not corresponding to publication place shall not be registered.", "CRITICAL",
         "Titles suggesting any association with a foreign country, city, or place which does not correspond to the State or place of publication of the periodical shall not be registered", True, "foreign location dict", ["New York Mirror"], ["Mumbai Mirror"],
         "Titles suggesting any association with a foreign country, city, or place which does not correspond to the State or place of publication of the periodical shall not be registered (Example: “South Africa Times\", \"Canada Times\", or \"New York Mirror\").")

# National Leaders
add_rule("R-GOV-08", "Guideline 14", "National leaders", "Titles with the names of national leaders will not be registered.", "CRITICAL",
         "Titles with the names of national leaders or those resembling the names of prominent national leaders... will not be registered.", True, "national leader dict", ["Mahatma Gandhi News"], ["National Freedom Review"],
         "Titles with the names of national leaders or those resembling the names of prominent national leaders, Heads of Government, and functionaries of Central and State governments will not be registered.")
add_rule("R-GOV-09", "Guideline 14", "Heads of Government", "Titles with names resembling Heads of Government will not be registered.", "CRITICAL",
         "Titles with the names of... Heads of Government, and functionaries of Central and State governments will not be registered.", True, "heads of gov dict", ["Prime Minister News"], ["Governance Today"],
         "Titles with the names of national leaders or those resembling the names of prominent national leaders, Heads of Government, and functionaries of Central and State governments will not be registered.")

# Broadcasting
add_rule("R-MED-01", "Guideline 15", "TV/Radio Channels", "Title registered as a Satellite TV Channel/FM Radio... shall not be registered unless by owner.", "CRITICAL",
         "Title registered as a Satellite TV Channel/FM Radio/Community Radio Station... shall not be registered unless the application is made by their owner", True, "broadcast registry check", ["Aajtak News"], ["Local Suburb News"],
         "Title registered as a Satellite TV Channel/FM Radio/Community Radio Station with the Ministry of Information and Broadcasting shall not be registered unless the application is made by their owner or by their representative on his behalf")

# Well-known periodicals
add_rule("R-DUP-06", "Guideline 16", "Well-known periodicals", "Titles resembling the titles of well-known periodicals applied by non-owners shall not be registered.", "CRITICAL",
         "Titles resembling the titles of well-known periodicals if applied by anyone other than the existing owner of the well-known title shall not be registered.", True, "well-known trademark check", ["The Hindu Weekly"], ["Local Hindu Community News"],
         "Titles resembling the titles of well-known periodicals if applied by anyone other than the existing owner of the well-known title shall not be registered.")

# Classifieds / Ads
add_rule("R-COM-01", "Guideline 17", "Advertisement/Classifieds", "Titles using words like Ad, Advertisement, Classifieds will not be registered.", "CRITICAL",
         "Titles using words like Ad or Advertisement, Classifieds... shall not be registered.", True, "classifieds keywords", ["Delhi Classifieds"], ["Delhi Daily"],
         "Titles using words like Ad or Advertisement, Classifieds, Tender, Calendar, Panchang, Matrimonial, Yellow pages (generally prefixed with white, pink, etc.), pamphlet, brochure, directory, or any such publication which cannot be treated as a periodical shall not be registered.")
add_rule("R-COM-02", "Guideline 17", "Matrimonial/Panchang", "Titles using words like Matrimonial or Panchang will not be registered.", "CRITICAL",
         "Titles using words like... Calendar, Panchang, Matrimonial... shall not be registered.", True, "matrimonial keywords", ["Royal Matrimonial"], ["Royal Heritage"],
         "Titles using words like Ad or Advertisement, Classifieds, Tender, Calendar, Panchang, Matrimonial, Yellow pages (generally prefixed with white, pink, etc.), pamphlet, brochure, directory, or any such publication which cannot be treated as a periodical shall not be registered.")
add_rule("R-COM-03", "Guideline 17", "Yellow pages/Directory", "Titles using words like Yellow pages, directory, brochure will not be registered.", "CRITICAL",
         "Titles using words like... Yellow pages... pamphlet, brochure, directory... shall not be registered.", True, "directory keywords", ["City Yellow Pages"], ["City Business News"],
         "Titles using words like Ad or Advertisement, Classifieds, Tender, Calendar, Panchang, Matrimonial, Yellow pages (generally prefixed with white, pink, etc.), pamphlet, brochure, directory, or any such publication which cannot be treated as a periodical shall not be registered.")

# Now for the categories explicitly requested but not in the guidelines document
# 1. internet, URL and domain-style patterns, and internet slang
add_rule("R-URL-01", "Unverified/Missing", "URL and domain-style patterns", "Titles containing URL or domain-style patterns (e.g. .com, .in) are not allowed.", "CRITICAL",
         "Missing from source document 'Guidelines for Admissibility of Titles' in repository.", False, "regex for URLs/domains", ["news.com", "daily.in"], ["Daily News"],
         "N/A")
add_rule("R-URL-02", "Unverified/Missing", "Internet slang", "Titles containing internet slang are not allowed.", "WARNING",
         "Missing from source document 'Guidelines for Admissibility of Titles' in repository.", False, "internet slang dictionary", ["LOL News", "BRB Times"], ["Laugh Out Loud News"],
         "N/A")

# 2. character length, minimum and maximum
add_rule("R-LEN-02", "Unverified/Missing", "Minimum character length", "Titles must meet a minimum character length requirement.", "CRITICAL",
         "Missing from source document 'Guidelines for Admissibility of Titles' in repository.", False, "length check", ["A", "Of"], ["The Age"],
         "N/A")
add_rule("R-LEN-03", "Unverified/Missing", "Maximum character length", "Titles must not exceed a maximum character length requirement.", "CRITICAL",
         "Missing from source document 'Guidelines for Admissibility of Titles' in repository.", False, "length check", ["This is a ridiculously long title that goes on forever and ever and ever and ever and ever and ever"], ["Normal Length Title"],
         "N/A")

# 3. the same word repeated within a title
add_rule("R-DUP-07", "Unverified/Missing", "Repeated words", "Titles must not contain the same word repeated consecutively or unnecessarily.", "CRITICAL",
         "Missing from source document 'Guidelines for Admissibility of Titles' in repository.", False, "consecutive word check", ["News News News", "Daily Daily"], ["Daily News"],
         "N/A")

# 4. religious and communal sensitivity
# (We already have R-DEC-01 from guideline 3, but let's add one specifically for communal sensitivity if needed. Guideline 3 covers religious sentiments. Guideline 10 covers "incite unrest or disorder". Let's add one explicitly for "communal sensitivity" if requested.)
add_rule("R-REL-01", "Unverified/Missing", "Communal sensitivity", "Titles must not promote communal disharmony.", "CRITICAL",
         "Missing from source document 'Guidelines for Admissibility of Titles' in repository.", False, "hate speech dictionary", ["Anti-Community News"], ["Community Harmony Review"],
         "N/A")


os.makedirs("rules", exist_ok=True)
with open("data/rules/rules.json", "w") as f:
    json.dump(rules, f, indent=2)

with open("data/rules/coverage.md", "w") as f:
    f.write("# Rules Coverage\n\n")
    f.write("| Restriction | Rule ID | Implemented | Clause verified | Notes |\n")
    f.write("|---|---|---|---|---|\n")
    for line in coverage:
        f.write(line + "\n")
