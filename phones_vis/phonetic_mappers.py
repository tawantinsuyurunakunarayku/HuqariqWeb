def parse_quz(word,phon_dict):
        ipa_seq = []
        arpb_seq = []
        nc = len(word)
        ini = 0
        while ini < nc:
                curr_gr = ''
                go_on = True
                if ini+3 <= nc:
                        if word[ini:ini+3] in phon_dict:
                                curr_gr = word[ini:ini+3]
                                go_on = False
                                ini += 3
                if go_on and ini+2 <= nc:
                        if word[ini:ini+2] in phon_dict:
                                curr_gr = word[ini:ini+2]
                                go_on = False
                                ini += 2
                if go_on:
                        curr_gr = word[ini:ini+1]
                        ini += 1
                orig = curr_gr
                if curr_gr in 'aiu':
                        if ini>0:
                                if word[ini-1]=='q': curr_gr = orig+'1'
                        if ini<nc-1:
                                if word[ini+1]=='q': curr_gr = orig+'1'
                # spanish rules
                if ini<nc-1:
                        if curr_gr in ['g','c','gu'] and word[ini+1] in 'ie':
                                curr_gr = orig + '1'
                if curr_gr not in phon_dict:
                        print("Not found: ",curr_gr,"|",word)
                        return [],[]
                ipa_seq .append(phon_dict[curr_gr]["ipa"])
                arpb_seq.append(phon_dict[curr_gr]["arpb"])
        return ipa_seq,arpb_seq


def parse_esp(word,phon_dict):
        ipa_seq = []
        arpb_seq = []
        nc = len(word)
        ini = 0
        while ini < nc:
                curr_gr = ''
                go_on = True
                if go_on and ini+2 <= nc:
                        if word[ini:ini+2] in phon_dict:
                                curr_gr = word[ini:ini+2]
                                go_on = False
                                ini += 2
                if go_on:
                        curr_gr = word[ini:ini+1]
                        ini += 1
                if curr_gr=='h':        continue
                orig = curr_gr
                if ini<nc-1:
                        if curr_gr in ['g','c','gu'] and word[ini+1] in 'ie':
                                curr_gr = orig + '1'
                        if curr_gr=='y' and word[ini+1] not in 'aeiou':
                                curr_gr = orig + '1'
                if curr_gr=='y' and ini==nc-1:
                        curr_gr = orig + '1'
                if ini>0 and ini<nc-1 and curr_gr=='r':
                        if any([word[ini-1] in 'aeiou' and word[ini+1] in 'aeiou',
                                        word[ini-1] not in 'aeiou' and word[ini+1] in 'aeiou']):
                                curr_gr = orig + '1'
                if curr_gr not in phon_dict:
                        print("Not found: ",curr_gr,"|",word)
                        return [],[]
                ipa_seq .append(phon_dict[curr_gr]["ipa"])
                arpb_seq.append(phon_dict[curr_gr]["arpb"])
        return ipa_seq,arpb_seq


