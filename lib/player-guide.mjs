import {runeProgression} from './rune-progression.mjs';
import {runeRarities,proposedRuneCost} from './rune-economy.mjs';
import {activities} from './activity.mjs';
import {recipes} from './recipe-catalog.mjs';
import {GP_MINT} from './gp-token.mjs';
export const guideCategories=[['all','All topics'],['start','Getting started'],['wallet','Wallet & holding'],['runes','Runes & production'],['skills','Skills & recipes'],['items','Items & economy'],['saving','Saves & troubleshooting'],['faq','Common questions']];
const article=(id,category,title,status,summary,paragraphs,extra={})=>({id,category,title,status,summary,paragraphs,...extra});
export const guideArticles=[
 article('start','start','Your first steps in Runelana','live','Create an account, explore the dashboard, and choose what to produce.',[
  'Create an email-and-password account, confirm your email when prompted, then sign in. Successful sign-in opens the player dashboard at /play. A wallet is separate from your account login.',
  'Open Settings to verify a Solana wallet and check its GP balance and holding history. Once at least one completed holding day is verified, Air Rune production starts automatically.',
  'Open Rune Production to divide your output among unlocked runes. Compare the Inventory column with your allocation, then confirm. Use Skill opens the activity selector, with seven professions, search, and Available / All filters. Skill Tree in the left sidebar opens progression and specializations.'
 ],{action:'Settings',keywords:'begin beginner new play sign up signup registration tutorial'}),
 article('available','start','What can I do now?','live','A quick map of active features, game prototypes, and future content.',[
  'Available now: account sign-in, wallet verification, GP balance and historical holding checks, passive rune production, allocation controls, and a separate Rune Inventory. Skill and specialization records are saved to your account.',
  'Account-saved prototypes: smithing steel bars, merchant delivery, game gold, adventure XP, equipment purchases, and equipping items. These follow your login across devices; player trading is not active.',
  'Preview only: profession training, the 35 recipe activities, specialization training, advanced item buffs, commissioned services, player-to-player trading, live leaderboards, friends, and multiplayer chat. Browsing these previews spends no resources.'
 ],{keywords:'live available coming soon unfinished roadmap prototype preview'}),
 article('profile','start','Your character profile and account settings','live','My Profile shows your character dashboard; Settings manages your account and wallet.',[
  'My Profile has Character, Progression, Skills, and Collection tabs. View your verified GP balance, holding milestones, saved skill levels, and owned equipment. Edit Profile changes your adventurer name.',
  'The character and equipment-slot illustrations are appearance previews. Collection lists actual owned prototype equipment; selecting an owned item equips it without repurchasing. Services Completed counts deliveries collected since account tracking began; older browser saves had no service counter.',
  'Open Settings from the sidebar or gear button for account management, wallet verification, balance refresh, unlinking, and detailed holding scans. The top-right wallet balance still opens your character profile.'
 ],{action:'My Profile',keywords:'profile character settings edit name appearance avatar badges equipment collection'}),
 article('account','start','Accounts, email confirmation, and passwords','live','Use email to sign in; your wallet does not replace your player account.',[
  'Use Play Now to create an account, or choose Sign In if you already have one. Follow the confirmation email, then sign in on Runelana. Account settings lets you sign out or request a password reset.',
  'If confirmation opens localhost:3000, that is an old or incorrect redirect—not the game server. Return to www.runelana.com and try signing in; if your email is still unconfirmed, the confirmation link needs to be corrected by the site administrator. Do not share the full confirmation link, because it can contain your login token.',
  'If you forgot your password, choose the password-reset option on the sign-in form. Open the reset email and choose a new password.'
 ],{keywords:'login log in email safari localhost verification confirm reset password account settings'}),
 article('wallet','wallet','Verify a wallet and view GP','live','Link your own Phantom or Solflare wallet from Settings.',[
  'Sign in, open Settings, choose your wallet, and select Connect & verify wallet. Approve the ownership message in the wallet. This verification requests a signature, not a transaction, token transfer, or network fee. Never enter your recovery phrase or private key into Runelana.',
  'Phantom and Solflare are supported. On mobile, open Runelana in the wallet’s built-in browser and sign in there. If the wallet is not detected, use Check for wallet.',
  'One wallet can be linked to one player account at a time. Verification and balances follow your player account. The top-right GP display shows the linked wallet balance; select it to open My Profile.'
 ],{action:'Settings',keywords:'connect phantom solflare mobile extension signature fee seed phrase verification'}),
 article('gp-balance','wallet','Which GP balance counts?','live','Runelana checks the specific GP token in your verified Solana wallet.',[
  `The network is Solana mainnet. The GP mint is ${GP_MINT}. A token with the same name but a different mint does not count.`,
  'Balances are summed across matching GP token accounts owned by the verified wallet. Tokens held in staking, liquidity pools, escrow, custodial exchanges, or other wallets are not included in that wallet balance.',
  'Use Refresh GP balance in Settings after a transfer. Background scans also check linked wallets daily, even when you are signed out. The last-checked time matters: scans are not a live transaction feed. A failed scan shows unavailable or a last-known balance, rather than inventing a zero.'
 ],{action:'Settings',keywords:'amount 0 zero missing balance mint contract address token daily scan refresh staked pool exchange'}),
 article('holding','wallet','Longest holding streak and rune unlocks','live','Your best uninterrupted GP holding period determines your rune tier.',[
  'Holding time starts when GP first arrives in that wallet, whether by purchase or transfer. History checks reconstruct positive and zero-balance periods. Unlocks use the longest verified uninterrupted positive period, measured in completed days.',
  'Example: hold GP for 10 days, have zero for 3 days, then hold it for 5 more days. Your longest streak is 10 days—not 15 days and not the latest 5-day streak. A zero balance ends the current streak, but the historical best is retained.',
  'Settings also shows first receipt, current streak, total holding time, time without GP, and recent zero-balance gaps. Large histories can need several scans. Incomplete scans do not grant guessed days; the last verified result remains visible.',
  'The separate Observed GP holding period is a daily-scan counter. It can reset after a zero or a long scanning gap and can miss movements between scans. Rune unlocks use verified historical longest streaks instead.'
 ],{action:'Settings',keywords:'first purchase transfer longest uninterrupted streak days zero gap 10 3 5 scan history'}),
 article('wallet-changes','wallet','Changing, unlinking, or emptying a wallet','live','Eligibility follows the wallet linked to your profile.',[
  'Reverifying the same wallet preserves its history. Changing wallets requires verifying the new wallet and scanning its own history; holding time is not added across different wallets.',
  'Unlinking removes the wallet from the profile and pauses eligible production. Earned rune inventory is retained. A wallet change can reset allocation to Air, or to zero while awaiting eligibility. Review Rune Production afterward.',
  'For a still-linked wallet, reaching zero does not erase its best verified historical streak. Current rune eligibility uses that historical record, rather than requiring the present GP balance to stay positive.'
 ],{keywords:'unlink remove switch change wallet sold sell zero keep lose progress'}),
 article('unlocks','runes','All eight rune unlocks','live','Holding-based character status advances at each rune milestone.',[
  'Air, Mind, Water, Fire, Nature, Death, Blood, and Soul unlock at the milestones below. Character status is awarded from holding history; it is not a profession level or an additional XP requirement.',
  'Rarity describes the unlock progression. Runes are account-bound production materials and do not have a player-traded market price.'
 ],{table:{headers:['Rune','Rarity','Holding days','Character status'],rows:runeProgression.tiers.map(r=>[r.name,runeRarities[r.id],`${r.holdingDays} days`,`Level ${r.characterLevel}`])},action:'Rune Production',keywords:'air mind water fire nature death blood soul unlock level rarity common uncommon rare epic legendary'}),
 article('production','runes','Automatic rune production and offline earnings','live','Current production is a shared total of 10 runes per hour.',[
  'After the first verified holding-day unlock, production defaults to 10 Air Runes per hour. It runs passively, including while you are signed out, with no offline cap or Collect button.',
  'The current total is 10 runes/hour across all allocated types: 240 per day, 1,680 per week, or 7,200 in 30 days. Unlocking more types or holding more GP does not increase this total.',
  'Past holding history can unlock a tier immediately after verification, but it does not award runes for time before production became active. Partial progress toward the next rune carries forward.'
 ],{action:'Rune Production',keywords:'passive idle offline automatic always on hourly daily cap 10 240 1680 7200 retroactive'}),
 article('allocation','runes','Allocate production using your inventory','live','Compare what you own with what you want to make.',[
  'Open the Rune Production decision. Every rune row shows its inventory balance beside the minus/plus allocation controls. A small bar shows progress toward the next whole rune. Selecting a rune shows its details and current versus draft allocation.',
  'Assign whole hourly units to unlocked types. The total must equal 10 before Confirm Allocation becomes available. You can choose one type or several; for example, 6 Fire and 4 Water produces 6 Fire plus 4 Water per hour under today’s rates.',
  'Editing is only a draft until you confirm. Live inventory continues using the saved allocation. Reset Allocation restores the saved split, not your inventory. If another window changed the split, reset to the latest saved allocation and try again.',
  'Choose a split based on your planned recipes and stockpiles. A larger stockpile does not guarantee useful items, sales, or profit.'
 ],{action:'Rune Production',keywords:'allocate allocation minus plus confirm disabled reset inventory stock balance draft conflict'}),
 article('inventories','runes','Rune Inventory versus item Inventory','live','Runes, crafting supplies, and equipment are different resources.',[
  'Runes opens your account’s Rune Inventory. Air through Soul are stored separately from equipment and item materials. Earned runes cannot be traded or gifted.',
  'Inventory shows steel bars, prototype crafting supplies, owned equipment, and the equipped item. The existing smithing and shop controls spend crafting supplies; they do not spend your eight typed rune balances.',
  'The production popup shows whole runes and fractional progress. If the count is still zero, check the progress bar, saved allocation, and eligibility. Unavailable data should be retried rather than assumed to mean an empty inventory.'
 ],{action:'Runes',keywords:'inventory items runes supplies separate fractional zero progress transfer gift trade'}),
 article('production-proposal','runes','Proposed slower high-tier production','proposal','These daily limits are a balancing proposal, not today’s rates.',[
  'The proposed model shares 10 capacity units per hour across every holding level. Higher-tier runes cost more capacity; fractional output accumulates. Each maximum below assumes all capacity goes to that one rune, so the limits cannot all be earned at once.',
  'With the proposal, full Soul allocation would produce 2 per day, 60 in 30 days, or 730 in a year after unlocking. A recipe needing 10 Soul would represent at least five days of full Soul production, before other ingredients and crafting time.',
  'Live production still uses 10 runes per hour. The proposed costs have not been activated or applied to existing balances.'
 ],{table:{headers:['Rune','Capacity / rune','Proposed max / day'],rows:runeProgression.tiers.map(r=>[r.name,String(proposedRuneCost(r.id)),String(240/proposedRuneCost(r.id))])},keywords:'proposed proposal rates capacity scarce scarcity soul 2 60 730 death 30 blood 12 fire 120'}),
 article('levels','skills','Three separate kinds of level','live','Holding status, adventure XP, and profession mastery are independent.',[
  'Character status comes from verified GP holding milestones and determines rune unlocks. It does not level up from smithing or service rewards.',
  'Adventure level is saved to your account. It starts at 1 and gains a level for each 60 adventure XP earned from completed activities.',
  'The seven profession levels and their specialization progress are account records. Each starts at level 0 with 0 XP. Profession XP thresholds and the training engine are not live; prototype adventure XP does not train these professions.'
 ],{action:'Skill Tree',keywords:'level xp experience character status adventure profession zero 0 60'}),
 article('skills','skills','Seven professions and their rune uses','preview','Open Skill Tree in the left sidebar to explore every profession.',[
  'Fishing, Farming, Mining, Smithing, Crafting, Enchanting, and Cooking have separate skill records. Cooking opens by default. Select another profession from the expanded sidebar.',
  'Skill Tree previews milestones and three specialization paths. Items lists draft recipe inputs, rune costs, outputs, required levels, durations, and XP. Services previews future commissions. Guide explains that profession and the rune economy.',
  'Primary rune uses define a profession’s main resource needs. Secondary uses apply to selected activities; neither list means every recipe consumes every listed rune. Enchanting uses all eight types, while other professions have smaller combinations.'
 ],{action:'Skill Tree',keywords:'fishing farming mining smithing crafting enchanting cooking seven primary secondary skill tree'}),
 article('rune-uses','skills','Which runes does each skill use?','preview','Primary and secondary uses describe the draft economy, not a universal recipe cost.',[
  'Primary uses are the profession’s main rune needs. Secondary uses appear in selected recipes. Basic recipes are rune-free, and each other recipe names its own combination and quantities. These mappings support the planned training economy.'
 ],{table:{headers:['Skill','Primary runes','Secondary runes'],rows:[
  ['Fishing','Air, Water','Mind, Nature, Death, Soul'],['Farming','Water, Nature, Soul','Mind, Fire, Death, Blood'],['Mining','Nature, Death, Blood','Air, Water, Fire, Soul'],['Smithing','Fire, Death, Blood, Soul','Air, Mind, Nature'],['Crafting','Air, Mind, Nature, Blood, Soul','Water, Fire, Death'],['Enchanting','All eight rune types','None'],['Cooking','Water, Fire, Nature, Soul','Mind, Blood']
 ]},action:'Skill Tree',keywords:'mapping rune usage primary secondary fishing farming mining smithing crafting enchanting cooking'}),
 article('rune-purposes','runes','What is each rune used for?','preview','Each rune has a distinct purpose in the planned recipe economy.',[
  'These uses guide recipe design. They do not activate spells, buffs, or profession training yet. Current recipe combinations can be inspected under Skills → Items.'
 ],{table:{headers:['Rune','Purpose'],rows:[['Air','Precision and movement'],['Mind','Knowledge and technique'],['Water','Growth and preservation'],['Fire','Heat and transformation'],['Nature','Growth and refinement'],['Death','Dangerous materials and dark magic'],['Blood','Powerful equipment and rare materials'],['Soul','Legendary and prestige creations']]},keywords:'air mind water fire nature death blood soul purpose uses magic spells buffs'}),
 article('specializations','skills','Specializations and path previews','preview','The design introduces three paths per profession at level 30.',[
  'Cooking previews Everyday Chef, Artisan Chef, and Master Chef. Other professions have their own three paths. You can view every path and inspect example unlocks.',
  'Viewing or switching a preview does not choose a permanent specialization, consume runes, or award XP. All specialization records begin at zero. Training paths and their item benefits are still planned.'
 ],{action:'Skill Tree',keywords:'specialization path master chef artisan everyday level 30 select choose reset'}),
 article('recipes','skills','Basic, Intermediate, and Advanced recipes','preview',`${recipes.length} draft recipes span seven skills; Basic recipes require no runes.`,[
  'Basic activities need no runes and are intended as an entry point without GP. Examples include catching shrimp, growing wheat, and mining copper. Processing recipes may still need ordinary materials.',
  'Intermediate activities use Common and Uncommon runes. Advanced recipes combine at least one Rare, Epic, or Legendary rune with other rune types and materials. Common and Uncommon runes still matter in late-game recipes.',
  'There are five draft recipes per skill: two Basic, two Intermediate, and one Advanced. Their costs, timings, XP, levels, and outputs are balancing proposals. The catalog is viewable now, but training and crafting these recipes are not activated. An unset cost is not a free recipe.'
 ],{action:'Skill Tree',keywords:'recipe recipes basic intermediate advanced no runes free materials ingredients costs quantities draft 35'}),
 article('prestige','skills','Legendary materials and collectible creations','preview','Prestige is intended to come from finished creations, not stored runes.',[
  'Soul is a Legendary-tier resource, but the rune itself is an account-bound crafting material. Finished weapons, equipment, seasonal goods, and rare crafted items are the intended collectibles.',
  'The draft seasonal enchantment requires level 85 Enchanting, 24 hours of crafting, 10 Soul, 1 Blood, 2 Mind, a Prestige Amulet, and 2 Moonherbs. The materials have their own upstream crafting requirements.',
  'Not every advanced recipe requires Soul. For example, the draft Legendary Armor recipe uses Blood, Fire, and Nature alongside steel and a Shadow Crystal. All these advanced recipes remain previews.'
 ],{action:'Skill Tree',keywords:'prestige legendary collectible seasonal enchantment weapon armor soul 10 mastery'}),
 article('activities','items','Current smithing and merchant service','prototype','These playable activities save progress to your account.',[
  `Use Skill opens a separate activity-selection window. Choose Smithing and the playable Steel Bars row to spend ${activities.smith.cost} crafting supplies, wait ${activities.smith.duration/60000} minutes, then collect ${activities.smith.bars} Steel Bars and ${activities.smith.xp} adventure XP.`,
  `Provide Service starts a merchant delivery: wait ${activities.service.duration/1000} seconds, then collect ${activities.service.gp} game gold and ${activities.service.xp} adventure XP. No crafting supplies are required.`,
  'Only one activity can run at a time. Its timer can finish while you are away, but rewards require Collect. Cancel returns spent crafting supplies. Passive rune production continues independently and does not occupy this activity slot.',
  'New accounts start with 120 crafting supplies. There is no current control for replenishing those prototype supplies. Merchant delivery remains available when supplies run out.'
 ],{action:'Use Skill',keywords:'smith steel bars merchant delivery service collect reward timer cancel busy supplies 20 120 seconds'}),
 article('currencies','items','Wallet GP versus game gold','live','The header and Bank intentionally show different balances.',[
  'The top-right header shows on-chain GP in your verified Solana wallet. Holding history for that token unlocks rune production.',
  'Bank shows game gold earned from prototype merchant services. Although the prototype labels it GP, it has no real-money value and does not transfer into your crypto wallet. It does not count toward holding history.',
  'Crafting supplies and typed runes are separate resources from both balances. Today’s equipment shop spends crafting supplies, not your on-chain GP.'
 ],{action:'Bank',keywords:'gp gold currency bank header balance money withdraw cash wallet 40 difference'}),
 article('market','items','Equipment, Collection, and the future marketplace','prototype','Equipment is account-saved; player trading is not live.',[
  'Marketplace lets you buy prototype equipment with crafting supplies. Buying equips the item. Collection shows owned items and lets you equip them again without repurchasing.',
  'There is no active player-to-player trading, GP payment settlement, listing, or commissioned-service marketplace. The planned economy would sell finished goods and services for GP, while runes remain account-bound.',
  'A rune allocation or rare recipe does not guarantee a sale or a valuable item. Future value should depend on player demand. Prototype equipment and preview prices are not promises of on-chain value.'
 ],{action:'Marketplace',keywords:'market marketplace buy sell trading trade equip equipment collection price profit demand commission'}),
 article('social','items','Leaderboards, friends, and private notes','preview','Shared rankings and multiplayer messaging are not connected yet.',[
  'Homepage adventurer rankings are illustrative. The dashboard leaderboard shows a placeholder while shared rankings are being developed. Friends and multiplayer chat are also not connected.',
  'The game log shows local activity messages. Notes are private to the current view, not sent to other players. They are held only for the current dashboard session and can disappear on reload or navigation.'
 ],{keywords:'leaderboard friends chat messages multiplayer notes public private rankings'}),
 article('saves','saving','What is saved, and where?','live','Your profile, equipment, resources, and activity progress follow your login.',[
  'Account-saved: verified wallet link, GP snapshots and holding history, rune inventory and saved production allocation, and skill/specialization records. Sign into the same account to access those records on another device.',
  'Account-saved: equipment, collected items, steel bars, crafting supplies, game gold, adventure XP, and the active activity. Changes save before appearing as successful. Open tabs refresh periodically and when you return. If another device made a newer change, its progress loads before you try again.',
  'Existing players: your first visit imports the original browser save once. Visit from your original browser first; later devices use the account save and cannot overwrite it with an older local copy. The original browser copy is retained. Old service totals were not recorded, so the counter starts at zero. Game log and notes remain session-only.'
 ],{keywords:'save saved storage offline device browser refresh reset sync lost missing progress account'}),
 article('troubleshooting','saving','When data is loading, stale, or unavailable','live','Check your session, the last scan, and whether the feature is active.',[
  'If GP appears wrong, open Settings and check the linked wallet, mint, and last-checked time, then refresh. A short cooldown prevents repeated refreshes. If no provider is detected on mobile, open the site in your wallet browser.',
  'If holding history is pending, let the scan complete and refresh later. Long histories may take several scans. If a request fails, Retry loads the last verified server data; a service outage does not prove your balance is zero.',
  'If Confirm Allocation is disabled, ensure a verified holding day has unlocked production, the draft totals exactly 10, and no save is in progress. Locked rune rows cannot receive allocation.',
  'If a skill remains level 0 or a recipe has no Start button, profession training is still a preview. Current smithing rewards adventure XP, not profession XP.'
 ],{action:'Settings',keywords:'error unavailable stale retry loading pending failed disabled confirm button zero start not working'}),
];
const faq=(id,category,title,answer,keywords='')=>article(id,category,title,'faq',answer,[answer],{faq:true,keywords});
export const guideFAQs=[
 faq('faq-wallet','start','Do I need a wallet to create an account?','No. Sign in with email and password. A verified wallet with qualifying GP history is needed for rune production, not account creation.','signup wallet login'),
 faq('faq-free','skills','Can I play without GP or runes?','You can create an account, browse the dashboard, and use prototype activities. Basic profession recipes are designed to require no runes, but their training engine is not live yet.','free beginner basic'),
 faq('faq-buy','wallet','Does receiving GP by transfer count?','Yes. Purchases and incoming transfers both count toward holding time while the wallet has a positive balance.','purchase buy swap transfer'),
 faq('faq-streak','wallet','What if my wallet goes to zero?','The current streak ends, but your longest verified historical streak is retained. Ten days held, three days empty, then five days held still gives a longest streak of ten days.','sell reset days'),
 faq('faq-offline','runes','Will runes keep producing if I close the game?','Yes, once eligible production is active. It continues with your saved allocation while you are away, with no offline cap or manual collection.','offline afk passive logout'),
 faq('faq-collect','runes','Do I need to collect runes?','No. Runes enter Rune Inventory automatically. The Collect button applies to completed prototype smithing or merchant-service activities.','claim collect automatic'),
 faq('faq-more','runes','Does holding more GP increase my production?','No. Today the shared output is fixed at ten runes per hour. Holding milestones unlock more rune types; they do not increase the total output.','capacity boost balance'),
 faq('faq-confirm','runes','Why can’t I confirm my allocation?','Production must be unlocked, allocated only to unlocked types, and total exactly ten. Finish any pending save. If another window changed your split, use Reset Allocation before trying again.','disabled allocation save conflict'),
 faq('faq-zero','runes','Why is my rune inventory still zero?','Check that production is active and that the rune has a saved allocation above zero. Whole-rune counts stay at zero until one finishes; the small bar shows fractional progress.','fraction partial inventory'),
 faq('faq-soul','runes','Is Soul production already limited to two per day?','No. Two Soul per day is the proposed rate at full allocation. Current live production remains ten runes per hour across your allocated types.','proposal legendary 2 daily'),
 faq('faq-trade','items','Can I trade, gift, or sell my runes?','No. Runes are account-bound materials. The planned marketplace is for finished items and services; player trading is not active yet.','transfer send sell marketplace'),
 faq('faq-gold','items','Why does Bank GP differ from my wallet balance?','Bank holds account-saved game gold from services. The header shows on-chain GP in your verified wallet. Game gold cannot be withdrawn and does not unlock runes.','balance withdraw money header'),
 faq('faq-level','skills','Why did smithing not raise my Smithing skill?','The current Steel Bar activity grants adventure XP. Profession and specialization training is not activated, so those separate account levels remain unchanged.','xp experience level zero 0'),
 faq('faq-cost','skills','Will viewing recipes or paths spend my runes?','No. Recipe and specialization screens are previews. Viewing them or choosing another path preview spends nothing and does not permanently select a path.','cost path choose reset'),
 faq('faq-device','saving','Will my equipment follow me to another device?','Yes. Equipment, items, game gold, adventure XP, and activities now follow your account alongside rune inventory, wallet links, and skills. Existing players should first open the updated game in their original browser so its old progress can be imported once. The first account save wins; later browser saves are not merged.','lost save sync storage'),
 faq('faq-active','items','Can I run several activities at once?','The current prototype has one active task slot. Complete or cancel that task before starting another. Automatic rune production runs independently.','parallel queue crafting time'),
 faq('faq-supplies','items','What can I do when crafting supplies run out?','The current prototype has no replenishment control for crafting supplies. You can still complete merchant delivery services, manage passive rune production if eligible, and explore skill previews.','empty supplies replenish gather'),
 faq('faq-wallet-change','wallet','Will changing wallets keep my old holding time?','The new wallet is evaluated from its own verified history. Time from different wallets is not combined. Earned rune inventory remains on your player account.','switch unlink change wallet'),
];
export const allGuideEntries=[...guideArticles,...guideFAQs];
const normalize=value=>value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function searchGuide(query='',category='all'){
 const ignored=new Set(['a','an','the','i','my','me','we','you','your','to','do','does','is','are','am','can','cant','why','how','what','when','where','and','or','of','for','it','in','on','with','get','s','t']);
 const words=normalize(query).split(' ').filter(word=>word&&!ignored.has(word));
 return allGuideEntries.filter(entry=>{
  if(category==='faq'&&!entry.faq)return false;
  if(category!=='all'&&category!=='faq'&&entry.category!==category)return false;
  const haystack=normalize([entry.title,entry.summary,...entry.paragraphs,entry.keywords,entry.table?entry.table.headers.concat(entry.table.rows.flat()).join(' '):''].join(' '));
  return words.every(word=>haystack.includes(word));
 });
}
