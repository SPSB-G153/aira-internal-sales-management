export function downloadFilename(baseName:string,extension:string,content:Record<string,unknown>){
  const safeBase=baseName.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase();
  const unitNumber=String(content.unit_number??"").trim().replace(/[^a-z0-9_-]+/gi,"-").replace(/^-|-$/g,"");
  return `${safeBase}${unitNumber?`_${unitNumber}`:""}.${extension}`;
}
