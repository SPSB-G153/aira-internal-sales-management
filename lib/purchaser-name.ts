const leadingTitle=/^(?:(?:mr|ms|mrs|miss|dr|dato'?|datin|tan\s+sri|puan\s+sri|en|cik)\.?\s+)+/i;

export function purchaserNameWithoutSalutation(value:string|null|undefined){
  return String(value||"").trim().replace(leadingTitle,"").trim();
}

export function salutationFromPurchaserName(value:string|null|undefined){
  const match=String(value||"").trim().match(/^(mr|ms|mrs|miss|dr|dato'?|datin|tan\s+sri|puan\s+sri|en|cik)\.?\b/i);
  if(!match)return "";
  const normalized=match[1].toLowerCase();
  const titles:Record<string,string>={mr:"Mr",ms:"Ms",mrs:"Mrs",miss:"Ms",dr:"Dr","dato'":"Dato'",dato:"Dato'",datin:"Datin","tan sri":"Tan Sri","puan sri":"Puan Sri",en:"En",cik:"Cik"};
  return titles[normalized]||match[1];
}
