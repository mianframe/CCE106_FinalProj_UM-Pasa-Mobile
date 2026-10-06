import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Appearance, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './src/supabase';
import { account, admin, Conversation, errorMessage, getPaymentProofSignedUrl, Item, marketplace, messaging, Notice, Transaction, transactions, uploadItemImage, uploadPaymentProof, User } from './src/api';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen, RegisterScreen } from './src/auth/AuthScreens';
import { ThemeProvider, useTheme, type ThemeMode } from './src/theme/ThemeContext';
import { profiles } from './src/services/profiles';
import { themeTokens, type ThemeColors, type ThemeTokens } from './src/theme/tokens';
import { formatPhilippineDateTime, formatPhilippineDate, formatPhilippineTime } from './src/utils/datetime';
import { MeetupTimePicker } from './src/components/common/MeetupTimePicker';

let T: ThemeTokens = themeTokens.light;
let C: ThemeColors = T.colors;
const palettes = {
  light: themeTokens.light.colors,
  dark: themeTokens.dark.colors,
};
const Stack = createNativeStackNavigator<any>(); const Tabs = createBottomTabNavigator<any>();

function Button({ title, onPress, secondary = false, danger = false, disabled = false }: any) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.buttonShell, secondary && s.buttonSecondary, danger && s.buttonDanger, disabled && { opacity: .55 }]}><LinearGradient colors={secondary ? (C.bg === themeTokens.dark.colors.bg ? ['rgba(255,255,255,.12)','rgba(255,255,255,.035)'] : ['#FFF4EC','#FFEFE5']) : danger ? ['#a61111','#650606'] : ['#f23b31','#b70201','#790101']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.button}><Text style={[s.buttonText, secondary && { color: C.gold }]}>{title}</Text></LinearGradient></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, multiline, secureTextEntry, keyboardType, autoCapitalize = 'sentences', onSubmitEditing }: any) {
  return <View style={s.fieldWrap}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder || label} placeholderTextColor={C.muted} multiline={multiline} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} onSubmitEditing={onSubmitEditing} style={[s.field, multiline && { minHeight: 100, textAlignVertical: 'top' }]} /></View>;
}
function Choice({ label, selected, onPress }: any) { return <Pressable onPress={onPress} style={[s.chip, selected && s.chipSelected]}><Text style={[s.chipText, selected && { color: C.bg === themeTokens.dark.colors.bg ? '#ffc270' : C.red }]}>{label}</Text></Pressable>; }
function Card({ children, style }: any) { return <LinearGradient colors={C.bg===themeTokens.dark.colors.bg?['rgba(255,255,255,.085)','rgba(255,255,255,.025)']:['#ffffff','#fbfcfd']} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.card, style]}>{children}</LinearGradient>; }
function MiniBars({ title, data=[] }: { title: string; data: { label: string; total: number }[] }) { const max=Math.max(1,...data.map(x=>x.total)); return <Card><Text style={s.section}>{title}</Text>{data.length?data.map(row=><View key={row.label} style={{marginVertical:6}}><View style={s.rowBetween}><Text style={s.muted}>{row.label}</Text><Text style={s.muted}>{row.total}</Text></View><View style={s.barTrack}><View style={[s.barFill,{width:`${Math.max(3,row.total/max*100)}%`}]}/></View></View>):<Text style={s.muted}>No activity yet.</Text>}</Card>; }
function Page({ children, refreshing, onRefresh, footer, topSafe = false, floatingAction }: any) { return <SafeAreaView edges={topSafe ? ['top','left','right','bottom'] : ['left','right','bottom']} style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.red} /> : undefined} contentContainerStyle={s.page}>{children}{footer && <MobileFooter navigation={footer.navigation}/>}</ScrollView>{floatingAction}</KeyboardAvoidingView></SafeAreaView>; }
function Heading({ title, subtitle }: any) { return <View style={{ marginBottom: 18 }}><Text style={s.heading}>{title}</Text>{subtitle ? <Text style={s.subheading}>{subtitle}</Text> : null}</View>; }
function MobileFooter({ navigation }: any) { const { user }=useAuth(); return <LinearGradient colors={['rgba(230,36,36,.13)','rgba(246,200,76,.055)','rgba(255,255,255,.025)']} locations={[0,.52,1]} style={s.footer}><View style={s.footerBrand}><View style={s.footerLogoRing}><Image source={require('./assets/UMPASALOGO.png')} style={s.footerLogo} resizeMode="contain"/></View><View style={{flex:1}}><Text style={s.footerTitle}>UM-Pasa</Text><Text style={s.muted}>University Marketplace</Text></View></View><Text style={s.footerCopy}>Browse items, post listings, request transactions, and track marketplace activity in one student workspace.</Text><View style={s.footerRule}/><Text style={s.eyebrow}>QUICK LINKS</Text><View style={s.footerLinks}><Pressable onPress={()=>navigation.navigate('About')} style={s.footerPill}><Text style={s.footerLinkText}>About Us</Text></Pressable><Pressable onPress={()=>navigation.navigate('Help')} style={s.footerPill}><Text style={s.footerLinkText}>Help & contact</Text></Pressable>{user&&<Pressable onPress={()=>navigation.navigate('Messages')} style={s.footerPill}><Text style={s.footerLinkText}>Inbox</Text></Pressable>}<Pressable onPress={()=>Linking.openURL('mailto:support@umindanao.edu.ph')} style={s.footerPill}><Text style={s.footerLinkText}>Email support</Text></Pressable></View><View style={s.footerRule}/><Text style={s.eyebrow}>QUICK INSTRUCTIONS</Text><Text style={s.footerStep}>01  Browse the marketplace or search by category.</Text><Text style={s.footerStep}>02  Open a listing to request it or message the seller.</Text><Text style={s.footerStep}>03  Confirm your meetup and complete the transaction.</Text><View style={s.footerBottom}><Text style={s.footerCopyright}>UM-Pasa © {new Date().getFullYear()} · University of Mindanao</Text><Text style={s.footerBadge}>University-safe trading</Text></View></LinearGradient>; }
function Status({ state, retry }: { state: string; retry?: () => void }) { return <Card><Text style={s.body}>{state}</Text>{retry ? <Button title="Try again" secondary onPress={retry} /> : null}</Card>; }
function money(v: any) { return `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`; }
function statusColor(status: string) { return status === 'approved' || status === 'available' || status === 'completed' ? C.green : status === 'rejected' || status === 'sold' ? (C.bg === themeTokens.dark.colors.bg ? '#ff8c82' : C.red) : C.gold; }

function BrowseScreen({ navigation }: any) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [carouselIndex,setCarouselIndex]=useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<any>({ sort: 'newest' });
  const filtersInitialized = useRef(false);
  const setFilter = (key: string, value: any) => setFilters((previous: any) => ({ ...previous, [key]: value }));
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await marketplace.list({ ...filters, q: q.trim() || undefined })); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [filters, q]);
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(useCallback(() => { loadRef.current(); }, []));
  useEffect(() => { if (filtersInitialized.current) loadRef.current(); else filtersInitialized.current = true; }, [filters]);
  const programsForDepartment = filters.department ? programs[filters.department] || [] : Array.from(new Set(Object.values(programs).flat()));
  const selectedCount = ['condition', 'department', 'program', 'course_code'].filter((key) => filters[key]).length;
  const toggle = (key: string, value: any) => setFilter(key, filters[key] === value ? undefined : value);
  return <Page refreshing={loading} onRefresh={load} footer={{navigation}} topSafe={!!user} floatingAction={<NotificationFab navigation={navigation}/> }>
    <View style={s.marketHero}>
      <LinearGradient colors={['#55201c', '#2b191a', '#1b1a1e']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.marketHeroGradient}>
        <View style={s.brandRow}>
          <View style={s.brandMark}><Image source={require('./assets/UMPASALOGO.png')} style={s.brandLogo} resizeMode="contain"/></View>
          <View style={{flex:1}}><Text style={s.brandName}>UM-Pasa</Text><Text style={s.brandCaption}>UNIVERSITY MARKETPLACE</Text></View>
          {!user && <Pressable style={s.signInPill} onPress={() => navigation.navigate('Login')}><Text style={s.signInText}>Sign in</Text></Pressable>}
        </View>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event)=>setCarouselIndex(Math.round(event.nativeEvent.contentOffset.x/(width-72)))} style={s.heroCarousel}>
          {[
            {icon:'bag-handle-outline',kicker:'CAMPUS SHOP',title:'Find what you need for campus.',copy:'Browse books, supplies, gadgets, and academic essentials.'},
            {icon:'repeat-outline',kicker:'SELL OR RENT',title:'Give useful items another semester.',copy:'List what you no longer need and set your own terms.'},
            {icon:'shield-checkmark-outline',kicker:'UM COMMUNITY',title:'Trade with more confidence.',copy:'Approved listings, campus meetups, and clear transaction steps.'},
          ].map((slide,index)=><View key={slide.kicker} style={[s.carouselSlide,{width:width-72}]}><Ionicons name={slide.icon as any} size={23} color="#ffc270"/><Text style={s.heroKicker}>{slide.kicker}</Text><Text style={s.heroTitle}>{slide.title}</Text><Text style={s.heroDescription}>{slide.copy}</Text><Pressable onPress={()=>navigation.navigate(index===2?'Help':'Browse')}><Text style={s.heroLink}>{index===2?'How it works  ›':'Explore marketplace  ›'}</Text></Pressable></View>)}
        </ScrollView>
        <View style={s.carouselDots}>{[0,1,2].map((dot)=><View key={dot} style={[s.carouselDot,dot===carouselIndex&&s.carouselDotActive]}/>)}</View>
        <View style={s.heroActions}><Pressable onPress={() => navigation.navigate('About')}><Text style={s.heroLink}>About UM-Pasa  ›</Text></Pressable><View style={s.heroDivider}/><Pressable onPress={() => navigation.navigate('Help')}><Text style={s.heroLink}>How it works  ›</Text></Pressable></View>
      </LinearGradient>
      <View style={s.heroGlow}/>
    </View>

    <Card style={s.searchPanel}>
      <Text style={s.searchLabel}>WHAT ARE YOU LOOKING FOR?</Text>
      <View style={s.searchRow}><TextInput value={q} onChangeText={setQ} onSubmitEditing={load} returnKeyType="search" placeholder="Search items or course code" placeholderTextColor="#9b9290" style={s.searchInput}/><Pressable accessibilityRole="button" onPress={load} style={s.searchButton}><LinearGradient colors={['#ef4035','#b70201','#810101']} style={s.searchButtonGradient}><Text style={s.searchButtonText}>GO</Text></LinearGradient></Pressable></View>
      <Text style={s.searchHint}>Try “Calculators”, “Books” or a course code.</Text>
    </Card>

    <View style={s.sectionTop}><View><Text style={s.sectionKicker}>DISCOVER</Text><Text style={s.sectionTitle}>Browse resources</Text></View><Text style={s.resultCount}>{items.length} found</Text></View>
    <Text style={s.filterLabel}>LISTING TYPE</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipStrip}>
      {[['All types', undefined], ['For sale', 'sell'], ['For rent', 'rent']].map(([label, value]: any) => <Choice key={label} label={label} selected={filters.listing_type === value} onPress={() => setFilter('listing_type', value)}/>)}
    </ScrollView>
    <Text style={s.filterLabel}>POPULAR CATEGORIES</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipStrip}>
      {['All', ...categories].map((value) => <Choice key={value} label={value} selected={value === 'All' ? !filters.category : filters.category === value} onPress={() => setFilter('category', value === 'All' || filters.category === value ? undefined : value)}/>)}
    </ScrollView>
    <View style={s.sortRow}><Text style={s.filterLabel}>SORT BY</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortChoices}>{[['Newest','newest'],['Oldest','oldest'],['Price ↑','price_low'],['Price ↓','price_high']].map(([label,value])=><Choice key={value} label={label} selected={filters.sort===value} onPress={()=>setFilter('sort',value)}/>)}</ScrollView></View>

    <Pressable style={s.filterToggle} onPress={() => setShowFilters(!showFilters)}><View><Text style={s.filterToggleTitle}>More filters {selectedCount ? '· ' + selectedCount + ' selected' : ''}</Text><Text style={s.filterToggleHint}>Condition, program and course</Text></View><Text style={s.filterChevron}>{showFilters ? '−' : '+'}</Text></Pressable>
    {showFilters && <Card style={s.advancedFilters}>
      <Text style={s.filterLabel}>CONDITION</Text><View style={s.rowWrap}>{[['Any',undefined],...['new','like_new','good','fair','poor'].map(v=>[v.replace('_',' '),v])].map(([label,value]:any)=><Choice key={label} label={label} selected={filters.condition===value} onPress={()=>toggle('condition',value)}/>)}</View>
      <Text style={s.filterLabel}>DEPARTMENT</Text><View style={s.rowWrap}><Choice label="All departments" selected={!filters.department} onPress={()=>setFilters({...filters,department:undefined,program:undefined})}/>{departments.map(v=><Choice key={v} label={v.replace('Department of ','')} selected={filters.department===v} onPress={()=>setFilters({...filters,department:filters.department===v?undefined:v,program:undefined})}/>)}</View>
      {programsForDepartment.length > 0 && <><Text style={s.filterLabel}>PROGRAM</Text><View style={s.rowWrap}><Choice label="All programs" selected={!filters.program} onPress={()=>setFilter('program',undefined)}/>{programsForDepartment.map(v=><Choice key={v} label={v} selected={filters.program===v} onPress={()=>toggle('program',v)}/>)}</View></>}
      <Field label="Course code" value={filters.course_code||''} onChangeText={(v:string)=>setFilter('course_code',v||undefined)} autoCapitalize="characters" onSubmitEditing={load}/>
    </Card>}
    {error ? <Status state={error} retry={load}/> : loading && !items.length ? <View style={s.loadingBlock}><ActivityIndicator color={C.red}/><Text style={s.muted}>Finding campus listings…</Text></View> : !items.length ? <Status state="No approved listings match your search yet." retry={load}/> : <View style={s.listingGrid}>{items.map(item=><Pressable key={item.id} style={[s.gridItem,{width:(width-43)/2}]} onPress={()=>navigation.navigate('Listing',{id:item.id})}><ItemCard item={item} compact/></Pressable>)}</View>}
  </Page>;
}
function NotificationFab({ navigation }: any) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    try { setUnread((await account.notifications()).filter((notice) => !notice.is_read).length); } catch { setUnread(0); }
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <Pressable accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={() => navigation.navigate(user ? 'Notifications' : 'Login')} style={s.notificationFab}><Ionicons name="notifications-outline" size={22} color="#ffffff"/>{unread > 0 && <View style={s.notificationCount}><Text style={s.notificationCountText}>{unread > 9 ? '9+' : unread}</Text></View>}</Pressable>;
}
async function openNotification(n:Notice,navigation:any,isAdmin:boolean) { try { if(!n.is_read) await account.markNotificationRead(n.id); } catch(e) { Alert.alert('Unable to update notification',errorMessage(e));return; } if(n.related_type==='transaction'&&n.related_id)navigation.navigate('Transaction',{id:n.related_id});else if(n.related_type==='conversation'&&n.related_id)navigation.navigate('Conversation',{id:n.related_id});else if(n.related_type==='item'&&n.related_id)navigation.navigate(isAdmin&&n.type==='listing_review'?'AdminItems':'Listing',isAdmin&&n.type==='listing_review'?{itemId:n.related_id}:{id:n.related_id});else Alert.alert('Activity update',n.message); }
function ItemCard({ item, compact = false }: { item: Item; compact?: boolean }) {
  return <Card style={s.itemCard}>
    <View style={s.rowBetween}><Text numberOfLines={1} style={s.eyebrow}>{item.category || 'CAMPUS RESOURCE'}</Text><Text style={[s.badge, { color: statusColor(item.status) }]}>{item.listing_type === 'rent' ? 'RENT' : 'SALE'}</Text></View>
    {item.image ? <Image source={{uri:imageUrl(item.image)}} style={[s.listingImage,compact&&s.listingImageCompact]} resizeMode="cover"/> : <View style={[s.listingImagePlaceholder,compact&&s.listingImagePlaceholderCompact]}><Ionicons name={item.listing_type === 'rent' ? 'calendar-outline' : 'pricetag-outline'} size={compact?20:24} color={C.gold} /><Text numberOfLines={1} style={s.placeholderCategory}>{item.category || 'Academic Resource'}</Text></View>}
    <Text numberOfLines={2} style={[s.cardTitle,compact&&s.cardTitleCompact]}>{item.title}</Text>
    <Text numberOfLines={1} style={[s.muted,compact&&s.mutedCompact]}>{item.condition?.replace('_', ' ')} · {item.course_code || item.department}</Text>
    <View style={s.itemCardBottom}><Text numberOfLines={1} style={[s.price,compact&&s.priceCompact]}>{money(item.price)}{item.listing_type==='rent'?' / day':''}</Text>{!compact&&<Text style={s.sellerName}>{item.user?.name || 'UM student'}  ›</Text>}</View>
  </Card>;
}

function ListingScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [days, setDays] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('cash_on_pickup');
  const [otherPayment, setOtherPayment] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      setItem(await marketplace.get(route.params.id));
    } catch (e) {
      setErr(errorMessage(e));
    }
  }, [route.params.id]);

  useEffect(() => { load(); }, [load]);

  const request = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to request this listing.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    if (item?.listing_type === 'rent') {
      const numDays = Number(days);
      const min = item.minimum_rental_days || 1;
      const max = item.maximum_rental_days || 365;
      if (!days.trim() || isNaN(numDays) || numDays < min || numDays > max) {
        Alert.alert('Rental duration required', `Please enter rental days between ${min} and ${max} before requesting.`);
        return;
      }
    }
    const methods = item?.accepted_payment_methods || ['cash_on_pickup'];
    setSelectedPayment(methods[0] || 'cash_on_pickup');
    setShowPaymentModal(true);
  };

  const doRequest = async (method: string) => {
    if (!item) return;
    if (method === 'other' && !otherPayment.trim()) {
      Alert.alert('Payment method required', 'Please specify the other payment method.');
      return;
    }
    setBusy(true);
    try {
      await transactions.request(item.id, {
        payment_method: method,
        ...(method === 'other' ? { other_payment_method: otherPayment.trim() } : {}),
        ...(item.listing_type === 'rent' ? { rental_duration_days: Number(days) } : {})
      });
      setShowPaymentModal(false);
      Alert.alert('Request sent', 'The seller has been notified.');
    } catch (e) {
      Alert.alert('Unable to request', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!item) return <Page><Status state={err || 'Loading listing…'} retry={load} /></Page>;

  const acceptedMethods = item.accepted_payment_methods && item.accepted_payment_methods.length > 0
    ? item.accepted_payment_methods
    : ['cash_on_pickup'];

  return (
    <Page>
      <Heading title={item.title} subtitle={`${item.category || ''} · ${item.course_code || item.department}`} />
      {item.image ? <Image source={{ uri: imageUrl(item.image) }} style={s.heroImage} /> : null}
      <Card>
        <Text style={s.price}>{money(item.price)}{item.listing_type === 'rent' ? ' / day' : ''}</Text>
        <Text style={s.body}>{item.description}</Text>
        <Text style={s.muted}>Condition: {item.condition?.replace('_', ' ')}</Text>
        <Text style={s.muted}>Department: {item.department}{item.program ? ` · ${item.program}` : ''}</Text>
        <Text style={s.muted}>Seller: {item.user?.name}</Text>
        <Text style={s.muted}>Payment: {acceptedMethods.map(v => v.replaceAll('_', ' ')).join(', ')}</Text>
        {item.created_at ? <Text style={s.muted}>Posted: {formatPhilippineDate(item.created_at)}</Text> : null}
        {item.archived_at ? <Text style={s.muted}>Archived listing · transaction history is retained</Text> : null}
      </Card>
      {!item.archived_at && item.listing_type === 'rent' && (
        <Field
          label={`Rental days (${item.minimum_rental_days || 1}–${item.maximum_rental_days || 365})`}
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
        />
      )}
      {!item.archived_at && user?.id !== item.user_id && (
        <Button title={busy ? 'Sending…' : 'Request this item'} disabled={busy} onPress={request} />
      )}
      {user?.id !== item.user_id && (
        <Button
          title="Message seller"
          secondary
          onPress={async () => {
            if (!user) {
              Alert.alert('Sign in required', 'Sign in to message the seller.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign in', onPress: () => navigation.navigate('Login') }
              ]);
              return;
            }
            try {
              const m = await messaging.send({
                recipient_id: item.user_id,
                item_id: item.id,
                body: `Hi, I'm interested in ${item.title}.`
              });
              navigation.navigate('Conversation', { id: m.conversation_id });
            } catch (e) {
              Alert.alert('Unable to message seller', errorMessage(e));
            }
          }}
        />
      )}
      {!item.archived_at && user && (user.id === item.user_id || user.role === 'admin') && (
        <Button title="Edit listing" secondary onPress={() => navigation.navigate('ListingForm', { item })} />
      )}
      {user?.id === item.user_id && item.status === 'available' && item.moderation_status === 'approved' && item.listing_type === 'sell' && (
        <Button
          title="Mark as sold"
          secondary
          onPress={() => Alert.alert(
            'Mark this listing sold?',
            `${item.title} will be removed from the available marketplace.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Mark sold',
                onPress: async () => {
                  try {
                    await marketplace.markSold(item.id);
                    await load();
                  } catch (e) {
                    Alert.alert('Unable to mark sold', errorMessage(e));
                  }
                }
              }
            ]
          )}
        />
      )}
      {!item.archived_at && user?.id === item.user_id && (
        <Button
          title="Delete listing"
          danger
          onPress={() => Alert.alert(
            'Archive listing?',
            'Transaction history, if any, will be retained.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Archive',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await marketplace.remove(item.id);
                    navigation.goBack();
                  } catch (e) {
                    Alert.alert('Unable to archive', errorMessage(e));
                  }
                }
              }
            ]
          )}
        />
      )}
      <Modal visible={showPaymentModal} transparent animationType="fade" onRequestClose={() => !busy && setShowPaymentModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', padding: 16 }}
          onPress={() => !busy && setShowPaymentModal(false)}
        >
          <Pressable
            style={{ backgroundColor: C.panel, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[s.rowBetween, { marginBottom: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Choose payment method</Text>
                <Text style={s.muted}>Accepted by seller for this item</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => !busy && setShowPaymentModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={C.muted} />
              </Pressable>
            </View>
            {acceptedMethods.map((m: string) => {
              const isSelected = selectedPayment === m;
              const label =
                m === 'gcash' ? 'GCash' :
                m === 'maya' ? 'Maya' :
                m === 'bank_transfer' ? 'Bank Transfer' :
                m === 'cash_on_pickup' ? 'Cash on Pickup' :
                m === 'other' ? 'Other payment method' :
                m.replaceAll('_', ' ');
              return (
                <Pressable
                  key={m}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedPayment(m)}
                  style={[
                    s.rowBetween,
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? C.red : C.border,
                      backgroundColor: isSelected ? C.soft : C.panel,
                      marginBottom: 8,
                    }
                  ]}
                >
                  <Text style={[s.body, { color: isSelected ? C.red : C.white, fontWeight: isSelected ? '700' : '500' }]}>
                    {label}
                  </Text>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? C.red : C.muted}
                  />
                </Pressable>
              );
            })}
            {selectedPayment === 'other' && (
              <Field
                label="Specify other payment method"
                value={otherPayment}
                onChangeText={setOtherPayment}
                placeholder="e.g. Palawan Pay, split payment"
              />
            )}
            <View style={{ marginTop: 8 }}>
              <Button
                title={busy ? 'Submitting request…' : 'Confirm request'}
                disabled={busy || (selectedPayment === 'other' && !otherPayment.trim())}
                onPress={() => doRequest(selectedPayment)}
              />
              <Button
                title="Cancel"
                secondary
                disabled={busy}
                onPress={() => setShowPaymentModal(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}
function imageUrl(path: string) { return /^https?:\/\//i.test(path) ? path : ''; }

const categories = ['Books','Uniforms','Gadgets','Calculators','Supplies','Lab & Science','Art Materials','Engineering Tools','Electronics','PE & Sports','Review Materials','Thesis & Research','School Bags','Dorm Essentials','Tickets & Events','Other'];
const programs: Record<string,string[]> = {
  'Department of Accounting Education':['BS in Accountancy','BS in Internal Auditing','BS in Management Accounting'],
  'Department of Arts and Sciences Education':['AB English','BS in Psychology'],
  'Department of Computing Education':['BS in Computer Science','BS in Information Technology'],
  'Department of Business Administration Education':['BS in Business Administration - Major in Financial Management','BS in Business Administration - Major in Human Resource Management','BS in Business Administration - Major in Marketing Management'],
  'Department of Hospitality Education':['BS in Hotel and Restaurant Management','BS in Tourism Management'],
  'Department of Criminal Justice Education':['BS in Criminology'],
  'Department of Engineering Education':['Major in Computer Engineering','Major in Electrical Engineering','Major in Electronics Engineering'],
  'Department of Teacher Education':['Bachelor in Elementary Education - Generalist','Bachelor in Physical Education','Bachelor in Secondary Education - Major in English','Bachelor in Secondary Education - Major in Filipino','Bachelor in Secondary Education - Major in Mathematics','Bachelor in Secondary Education - Major in Science','Bachelor in Secondary Education - Major in Social Studies'],
  'Junior High School':[],
  'Senior High School':['Science, Technology, Engineering and Mathematics (STEM)'],
  'Graduate School':['Master of Arts in Education - Teaching English','Master of Arts in Education - Teaching Filipino','Master of Arts in Education - Teaching Mathematics','Master of Arts in Education - Teaching Science','Master of Arts in Education - Teaching Physical Education','Master in Business Administration','Master in Management','Master in Public Administration']
};
const departments = Object.keys(programs);
function ListingFormScreen({ route, navigation }: any) {
  const edit = route.params?.item as Item | undefined;
  const [f, setF] = useState<any>(edit ? { ...edit, ...(categories.includes(edit.category)?{}:{category:'__custom',custom_category:edit.category}) } : { listing_type: 'sell', category: 'Books', condition: 'good', department: departments[0], accepted_payment_methods: ['cash_on_pickup'] });
  const [busy, setBusy] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(edit?.image || null);
  const set = (k: string, v: any) => setF((prev: any) => ({ ...prev, [k]: v }));

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Unable to pick image', errorMessage(err));
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      let imagePath = f.image_path || (edit?.image ? edit.image : null);
      if (imageUri && !imageUri.startsWith('http')) {
        imagePath = await uploadItemImage(imageUri);
      }
      await marketplace.save({ ...f, image_path: imagePath }, edit?.id);
      Alert.alert('Listing saved', edit ? 'Your changes were submitted for review.' : 'Your listing was submitted for review.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to save listing', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const pay = ['gcash','maya','bank_transfer','cash_on_pickup','other'];
  return <Page><Heading title={edit ? 'Edit listing' : 'Add a listing'} subtitle="Listings from students are reviewed before appearing in the marketplace." /><Field label="Title" value={f.title || ''} onChangeText={(v: string) => set('title', v)} /><Text style={s.label}>Category</Text><View style={s.rowWrap}>{categories.map(v => <Choice key={v} label={v} selected={f.category === v && !f.custom_category} onPress={() => {set('category', v);set('custom_category','');}} />)}<Choice label="Other / custom" selected={!!f.custom_category} onPress={() => set('category','__custom')} /></View>{f.category==='__custom'&&<Field label="Custom category" value={f.custom_category||''} onChangeText={(v:string)=>set('custom_category',v)}/>}<Field label="Description (at least 10 characters)" value={f.description || ''} onChangeText={(v: string) => set('description', v)} multiline /><Text style={s.label}>Listing type</Text><View style={s.row}><Choice label="For sale" selected={f.listing_type === 'sell'} onPress={() => set('listing_type', 'sell')} /><Choice label="For rent" selected={f.listing_type === 'rent'} onPress={() => set('listing_type', 'rent')} /></View>{f.listing_type === 'sell' ? <Field label="Price (₱)" value={String(f.price || '')} onChangeText={(v: string) => set('price', v)} keyboardType="decimal-pad" /> : <><Field label="Daily rental rate (₱)" value={String(f.daily_rental_rate || '')} onChangeText={(v: string) => set('daily_rental_rate', v)} keyboardType="decimal-pad" /><View style={s.row}><View style={{ flex: 1 }}><Field label="Minimum days" value={String(f.minimum_rental_days || '')} onChangeText={(v: string) => set('minimum_rental_days', v)} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label="Maximum days" value={String(f.maximum_rental_days || '')} onChangeText={(v: string) => set('maximum_rental_days', v)} keyboardType="number-pad" /></View></View></>}<Text style={s.label}>Condition</Text><View style={s.row}>{['new','like_new','good','fair','poor'].map(v => <Choice key={v} label={v.replace('_',' ')} selected={f.condition === v} onPress={() => set('condition', v)} />)}</View><Text style={s.label}>Accepted payment methods</Text><View style={s.rowWrap}>{pay.map(v => <Choice key={v} label={v.replaceAll('_',' ')} selected={f.accepted_payment_methods?.includes(v)} onPress={() => set('accepted_payment_methods', f.accepted_payment_methods?.includes(v) ? f.accepted_payment_methods.filter((x: string) => x !== v) : [...(f.accepted_payment_methods || []), v])} />)}</View><Text style={s.label}>Department</Text><View style={s.rowWrap}>{departments.map(v => <Choice key={v} label={v.replace('Department of ','')} selected={f.department === v} onPress={() => {set('department',v);set('program','');}} />)}</View>{(programs[f.department] || []).length>0&&<><Text style={s.label}>Program</Text><View style={s.rowWrap}>{programs[f.department].map(v=><Choice key={v} label={v} selected={f.program===v} onPress={()=>set('program',v)}/>)}</View></>}<Field label="Course code" value={f.course_code || ''} onChangeText={(v: string) => set('course_code', v.toUpperCase())} autoCapitalize="characters" /><Text style={s.label}>Listing photo (optional)</Text>{imageUri ? <View style={{ marginBottom: 14 }}><Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 8 }} resizeMode="cover" /><View style={s.row}><Button title="Change photo" secondary onPress={pickImage} /><Button title="Remove" danger onPress={() => { setImageUri(null); set('image_path', null); }} /></View></View> : <View style={{ marginBottom: 14 }}><Button title="📷 Select photo from library" secondary onPress={pickImage} /></View>}<Button title={busy ? 'Saving…' : 'Save listing'} disabled={busy} onPress={save} /></Page>;
}

function DashboardScreen({ navigation }: any) {
  const {width}=useWindowDimensions();
  const { user } = useAuth(); const [data, setData] = useState<any>(); const [err, setErr] = useState(''); const load = useCallback(async () => { try { if(user?.role==='admin'){const [users,items,txs]=await Promise.all([admin.users(),admin.items(),admin.transactions()]);const tally=(rows:any[],get:(row:any)=>string|undefined)=>Object.entries(rows.reduce((a:any,r:any)=>{const k=get(r);if(k)a[k]=(a[k]||0)+1;return a},{})).map(([label,total])=>({label,total:Number(total)})).sort((a,b)=>b.total-a.total).slice(0,6);const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));return d.toISOString().slice(0,7)});const monthly=months.map(k=>({label:new Date(`${k}-01T12:00:00`).toLocaleString('en',{month:'short'}),total:txs.filter(t=>String(t.created_at||'').slice(0,7)===k).length}));setData({stats:{users:users.length,students:users.filter(u=>u.role==='student').length,transactions:txs.length,completed:txs.filter(t=>t.status==='completed').length,items:items.length,pendingItems:items.filter(i=>i.moderation_status==='pending').length,approvedItems:items.filter(i=>i.moderation_status==='approved').length,rejectedItems:items.filter(i=>i.moderation_status==='rejected').length,activeListings:items.filter(i=>i.status==='available'&&i.moderation_status==='approved').length,rentals:items.filter(i=>i.listing_type==='rent').length,sales:items.filter(i=>i.listing_type==='sell').length},recent_items:items.slice(0,6),charts:{categories:tally(items,i=>i.category),departments:tally(items,i=>i.department),monthly}});}else{const [dashboard,notifications]=await Promise.all([account.dashboard(),account.notifications()]);setData({...dashboard,notifications:notifications.slice(0,5)});} setErr(''); } catch (e) { setErr(errorMessage(e)); } }, [user]); useFocusEffect(useCallback(() => { load(); }, [load]));
  if (err) return <Page><Status state={err} retry={load} /></Page>; if (!data) return <Page><ActivityIndicator color={C.gold} /></Page>;
  const stats = data.stats || {};
  const dashboardTiles = user?.role==='admin' ? [['Users',stats.users],['Students',stats.students],['Items',stats.items],['Pending review',stats.pendingItems],['Transactions',stats.transactions],['Completed',stats.completed]] : [['Listings',stats.total_items],['Pending',stats.pending_listings],['Requests',stats.pending_requests],['Completed',stats.completed_transactions]];
  return <Page topSafe onRefresh={load}><Heading title={`Hello, ${user?.name?.split(' ')[0] || 'there'}`} subtitle={user?.role === 'admin' ? 'UM-Pasa administration' : 'Your campus marketplace at a glance.'} />{user?.role==='admin'?<Button title={`Review listings${stats.pendingItems?` · ${stats.pendingItems}`:''}`} onPress={()=>navigation.navigate('AdminItems')}/>:<Button title="＋  Add a listing" onPress={()=>navigation.navigate('ListingForm')}/>}<View style={s.stats}>{dashboardTiles.map(([n,v]) => <Card key={String(n)} style={s.stat}><Text style={s.statNum}>{v ?? 0}</Text><Text style={s.muted}>{n}</Text></Card>)}</View><View style={s.rowWrap}>{user?.role==='admin'?<Button title="Admin panel" secondary onPress={()=>navigation.navigate('Admin')}/>:<><Button title="My listings" secondary onPress={() => navigation.navigate('MyListings')} /><Button title="Pending requests" secondary onPress={() => navigation.navigate('Transactions')} /><Button title="My report" secondary onPress={()=>navigation.navigate('Reports')}/></>}<Button title="Notifications" secondary onPress={() => navigation.navigate('Notifications')} /></View>{user?.role==='admin'&&<><MiniBars title="Listings by category" data={data.charts?.categories}/><MiniBars title="Listings by department" data={data.charts?.departments}/><MiniBars title="Monthly transactions" data={data.charts?.monthly}/></>}{user?.role!=='admin'&&data.notifications?.length>0&&<><Heading title="Recent activity"/>{data.notifications.map((n:Notice)=><Pressable key={n.id} accessibilityRole="button" onPress={()=>openNotification(n,navigation,user?.role==='admin')}><Card><View style={s.rowBetween}><Text style={[s.body,{color:n.is_read?C.muted:C.cream,flex:1}]}>{n.message}</Text><Ionicons name="chevron-forward" size={17} color={C.muted}/></View></Card></Pressable>)}</>}<View style={s.sectionTop}><Text style={s.sectionTitle}>Recent listings</Text><Pressable onPress={()=>navigation.navigate('Browse')}><Text style={{color:C.gold,fontWeight:'700'}}>See all ›</Text></Pressable></View><View style={s.listingGrid}>{(data.recent_items || []).map((item: Item) => <Pressable key={item.id} style={[s.gridItem,{width:(width-43)/2}]} onPress={() => navigation.navigate('Listing', { id: item.id })}><ItemCard item={item} compact/></Pressable>)}</View></Page>;
}

function TransactionsScreen({ navigation }: any) {
  const [list, setList] = useState<Transaction[]>([]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const load = useCallback(async () => { setBusy(true); try { setList(await transactions.list()); setErr(''); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); } }, []); useFocusEffect(useCallback(() => { load(); }, [load]));
  return <Page topSafe refreshing={busy} onRefresh={load}><Heading title="Transactions" subtitle="Requests, sales, rentals, and completed exchanges." />{err ? <Status state={err} retry={load} /> : !list.length && !busy ? <Status state="No transactions yet." /> : list.map(t => <Pressable key={t.id} onPress={() => navigation.navigate('Transaction', { id: t.id })}><Card><View style={s.rowBetween}><Text style={s.cardTitle}>{t.item?.title || 'Campus transaction'}</Text><Text style={[s.badge,{color:statusColor(t.status)}]}>{t.status?.toUpperCase()}</Text></View><Text style={s.muted}>{t.buyer?.name} ↔ {t.seller?.name}</Text><Text style={s.muted}>{t.payment_method?.replaceAll('_',' ') || 'Payment not selected'}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text></Card></Pressable>)}</Page>;
}
function TransactionScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [t, setT] = useState<Transaction>();
  const [err, setErr] = useState('');
  const [meetup, setMeetup] = useState('');
  const [meetupDate, setMeetupDate] = useState<Date | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await transactions.get(route.params.id);
      setT(data);
      if (data.payment_proof) {
        getPaymentProofSignedUrl(data.payment_proof).then(setProofUrl).catch(() => setProofUrl(null));
      } else {
        setProofUrl(null);
      }
    } catch(e) {
      setErr(errorMessage(e));
    }
  }, [route.params.id]);

  useEffect(() => { load(); }, [load]);

  if (!t) return <Page><Status state={err || 'Loading transaction…'} retry={load} /></Page>;
  const isSeller = user?.id === t.seller_id;
  const isBuyer = user?.id === t.buyer_id;
  const run = (title: string, action: () => Promise<any>) => Alert.alert(title, 'Continue with this transaction action?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: async () => { try { await action(); await load(); } catch(e) { Alert.alert('Action failed', errorMessage(e)); } } }]);
  const approve = async () => {
    if (!meetup.trim()) {
      Alert.alert('Missing meetup location', 'Please enter a meetup place before approving.');
      return;
    }
    if (!meetupDate) {
      Alert.alert('Missing meetup schedule', 'Please select a meetup date and time.');
      return;
    }
    if (meetupDate.getTime() <= Date.now()) {
      Alert.alert('Invalid meetup time', 'Meetup time must be set in the future.');
      return;
    }
    if (approving) return;
    setApproving(true);
    try {
      await transactions.approve(t.id, meetup.trim(), meetupDate.toISOString());
      await load();
      Alert.alert('Request approved','The buyer was notified.');
    } catch(e) {
      Alert.alert('Approval failed', errorMessage(e));
    } finally {
      setApproving(false);
    }
  };

  const pickProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingProof(true);
        await uploadPaymentProof(t.id, result.assets[0].uri);
        await load();
        Alert.alert('Payment proof uploaded', 'The seller can now view and verify your payment proof.');
      }
    } catch (err) {
      Alert.alert('Unable to upload proof', errorMessage(err));
    } finally {
      setUploadingProof(false);
    }
  };

  return <Page><Heading title={t.item?.title || 'Transaction'} subtitle={`Transaction #${t.id}`} /><Card><Text style={[s.badge,{color:statusColor(t.status)}]}>{t.status?.toUpperCase()}</Text><Text style={s.price}>{money(t.item?.price)}</Text><Text style={s.body}>Buyer: {t.buyer?.name}</Text><Text style={s.body}>Seller: {t.seller?.name}</Text><Text style={s.body}>Payment: {t.payment_method?.replaceAll('_',' ')}{t.other_payment_method?` · ${t.other_payment_method}`:''}</Text>{t.rental_duration_days?<Text style={s.body}>Rental duration: {t.rental_duration_days} day(s) · Due {formatPhilippineDate(t.rental_due_date, 'to be confirmed')}</Text>:null}{t.meetup_location ? <Text style={s.body}>Meetup: {t.meetup_location} · {formatPhilippineDateTime(t.meetup_time)}</Text> : null}<Text style={s.muted}>Payment proof: {t.payment_proof?`Uploaded ${formatPhilippineDateTime(t.payment_proof_uploaded_at, '')}`:'Not uploaded'}</Text>{proofUrl && <View style={{ marginTop: 10 }}><Text style={s.label}>Payment Proof Receipt:</Text><Image source={{ uri: proofUrl }} style={{ width: '100%', height: 220, borderRadius: 10, marginTop: 6 }} resizeMode="contain" /></View>}</Card>{isBuyer && ['pending','approved'].includes(t.status) && <View style={{ marginVertical: 6 }}><Button title={uploadingProof ? 'Uploading proof…' : t.payment_proof ? '📷 Replace payment proof' : '📷 Upload payment proof'} secondary disabled={uploadingProof} onPress={pickProof} /></View>}{isSeller && t.status === 'pending' && <><Field label="Meetup location" value={meetup} onChangeText={setMeetup} placeholder="e.g. Student Union Building / Library"/><MeetupTimePicker label="Meetup date & time" value={meetupDate} onChange={setMeetupDate}/><Button title={approving ? 'Approving request…' : 'Approve request'} disabled={approving || !meetup.trim() || !meetupDate} onPress={approve} /><Button title="Reject request" danger onPress={() => run('Reject request', () => transactions.reject(t.id))} /></>}{isSeller && t.status === 'approved' && <Button title="Mark as completed" onPress={() => run('Complete exchange', () => transactions.complete(t.id))} />}{t.status === 'completed' && !t.ratings?.some(r => r.reviewer_id === user?.id) && <><Text style={s.muted}>Both the buyer and seller can leave a review after completion.</Text><RatingForm id={t.id} onDone={load} /></>}{t.item && <Button title="Message participant" secondary onPress={async()=>{try{const recipient_id=user?.id===t.buyer_id?t.seller_id:t.buyer_id;const m=await messaging.send({recipient_id,item_id:t.item_id,body:`Hi, I want to coordinate about ${t.item?.title}.`});navigation.navigate('Conversation',{id:m.conversation_id});}catch(e){Alert.alert('Unable to message participant',errorMessage(e))}}}/>}</Page>;
}
function RatingForm({ id, onDone }: any) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await transactions.rate(id, rating, comment);
      Alert.alert('Thank you', 'Your rating has been submitted.');
      onDone();
    } catch(e) {
      Alert.alert('Unable to rate', errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
  return <Card><Text style={s.section}>Rate this exchange</Text><View style={s.row}>{[1,2,3,4,5].map(n => <Choice key={n} label={`${n} ★`} selected={rating === n} onPress={() => setRating(n)} />)}</View><Field label="Comment (optional)" value={comment} onChangeText={setComment} multiline /><Button title={submitting ? 'Submitting rating…' : 'Submit rating'} disabled={submitting} onPress={submit} /></Card>;
}

function MyListingsScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<Item[]>([]); const [err, setErr] = useState('');
  const load = useCallback(async () => { try { const report=await account.report(); setItems(report.items || []); } catch(e) { setErr(errorMessage(e)); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const markSold = (item: Item) => Alert.alert('Mark this listing sold?', `${item.title} will be removed from the available marketplace.`, [
    {text:'Cancel',style:'cancel'}, {text:'Mark sold',onPress:async()=>{try{await marketplace.markSold(item.id);await load();}catch(e){Alert.alert('Unable to mark sold',errorMessage(e));}}},
  ]);
  return <Page onRefresh={load}><Heading title="My listings" subtitle="Manage review status and availability."/><Button title="+ Add listing" onPress={() => navigation.navigate('ListingForm', {})} />{err ? <Status state={err} retry={load} /> : !items.length ? <Status state="You do not have listings yet." /> : <View style={s.listingGrid}>{items.map(i=><View key={i.id} style={{width:(width-43)/2}}><Pressable onPress={() => navigation.navigate('Listing', { id: i.id })}><ItemCard item={i} compact /></Pressable><Text numberOfLines={2} style={[s.badge,{color:statusColor(i.moderation_status),marginBottom:4}]}>{i.moderation_status === 'pending' ? 'PENDING REVIEW' : i.moderation_status?.toUpperCase()}</Text>{i.rejection_reason ? <Text numberOfLines={3} style={s.muted}>Reason: {i.rejection_reason}</Text> : null}{i.status==='available'&&i.moderation_status==='approved'&&i.listing_type==='sell'&&<Pressable accessibilityRole="button" onPress={()=>markSold(i)} style={s.soldButton}><Text style={s.soldButtonText}>Mark sold</Text></Pressable>}</View>)}</View>}</Page>;
}

function ProfileScreen({ navigation }: any) {
  const { user, profile, updateProfile, updatePassword, logout, deleteAccount } = useAuth();
  const { mode, setMode } = useTheme();
  const [name, setName] = useState(profile?.full_name || user?.name || '');
  const [studentNumber, setStudentNumber] = useState(profile?.student_number || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const save = async () => {
    if (password && password !== confirm) { Alert.alert('Check password', 'The new passwords do not match.'); return; }
    if (password && password.length < 8) { Alert.alert('Check password', 'Use at least 8 characters.'); return; }
    setBusy(true);
    try {
      await updateProfile({ full_name: name, student_number: studentNumber || null, department: department || null, program: program || null });
      if (password) await updatePassword(password);
      setPassword(''); setConfirm('');
      Alert.alert('Profile updated', 'Your account information has been saved.');
    } catch (e) { Alert.alert('Unable to update profile', e instanceof Error ? e.message : errorMessage(e)); }
    finally { setBusy(false); }
  };
  const confirmLogout = () => Alert.alert('Sign out?', 'You will need to sign in again to access your account.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: async () => {
      try { await logout(); } catch (e) { Alert.alert('Unable to sign out', e instanceof Error ? e.message : 'Please try again.'); }
    } },
  ]);
  const confirmDeleteAccount = () => Alert.alert(
    'Delete account?',
    'This will archive your active listings and deactivate your UM-Pasa student account. This action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete my account',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            Alert.alert('Account deleted', 'Your student account has been deactivated.');
          } catch (e) {
            Alert.alert('Unable to delete account', errorMessage(e));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]
  );
  return <Page topSafe><Heading title="Profile" subtitle="Account information" />
    <Card><Text style={s.eyebrow}>{profile?.role.toUpperCase() || 'STUDENT ACCOUNT'}</Text><Text style={s.muted}>{user?.email}</Text></Card>
    <Card><Text style={s.section}>Appearance</Text><Text style={s.muted}>Choose the display theme for UM-Pasa.</Text><View style={s.row}><Choice label="Light" selected={mode==='light'} onPress={()=>setMode('light')}/><Choice label="Dark" selected={mode==='dark'} onPress={()=>setMode('dark')}/></View></Card>
    <Field label="Full name" value={name} onChangeText={setName} />
    <Field label="Student number" value={studentNumber} onChangeText={setStudentNumber} autoCapitalize="characters" />
    <Field label="Department" value={department} onChangeText={setDepartment} />
    <Field label="Program" value={program} onChangeText={setProgram} />
    <Text style={s.section}>Change password</Text>
    <Field label="New password (optional)" value={password} onChangeText={setPassword} secureTextEntry />
    <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
    <Button title={busy ? 'Saving…' : 'Save profile'} onPress={save} disabled={busy} />
    <Button title="My listings" secondary onPress={()=>navigation.navigate('MyListings')}/>
    <Button title="My activity report" secondary onPress={()=>navigation.navigate('Reports')}/>
    <Button title="Notifications" secondary onPress={()=>navigation.navigate('Notifications')}/>
    <Button title="Sign out" secondary onPress={confirmLogout} />
    <Button title={deleting ? 'Deleting account…' : 'Delete account'} danger disabled={deleting} onPress={confirmDeleteAccount} />
  </Page>;
}

function NotificationsScreen({navigation}:any) { const {user}=useAuth();const [items,setItems] = useState<Notice[]>([]); const [filter,setFilter]=useState('all'); const [err,setErr]=useState(''); const load=useCallback(async()=>{try{setItems(await account.notifications());setErr('')}catch(e){setErr(errorMessage(e))}},[]); useFocusEffect(useCallback(()=>{load()},[load])); const read=async()=>{try{await account.markNotificationsRead(); await load()}catch(e){Alert.alert('Unable to update',errorMessage(e))}}; const open=async(n:Notice)=>{try{if(!n.is_read){await account.markNotificationRead(n.id);setItems(old=>old.map(x=>x.id===n.id?{...x,is_read:true}:x))}}catch(e){Alert.alert('Unable to update notification',errorMessage(e));return;}if(n.related_type==='transaction'&&n.related_id)navigation.navigate('Transaction',{id:n.related_id});else if(n.related_type==='conversation'&&n.related_id)navigation.navigate('Conversation',{id:n.related_id});else if(n.related_type==='item'&&n.related_id)navigation.navigate(user?.role==='admin'&&n.type==='listing_review'?'AdminItems':'Listing',user?.role==='admin'&&n.type==='listing_review'?{itemId:n.related_id}:{id:n.related_id});else Alert.alert('Activity update',n.message)};const types:Record<string,string[]>={requests:['request','message','meetup'],approved:['approval','completion'],pending:['request','rental_due_soon','rental_due','payment_proof','listing_review'],rejected:['rejection','rental_overdue'],ratings:['rating']}; const visible=items.filter(n=>filter==='all'?true:filter==='unread'?!n.is_read:(types[filter]||[]).includes(n.type)); return <Page onRefresh={load}><Heading title="Activity updates" subtitle="Requests, approvals, messages, and ratings."/><Button title="Mark all as read" secondary onPress={read} /><View style={s.rowWrap}>{['all','unread','requests','approved','pending','rejected','ratings'].map(f=><Choice key={f} label={f} selected={filter===f} onPress={()=>setFilter(f)}/>)}</View>{err?<Status state={err} retry={load}/>:!visible.length?<Status state="No notifications in this view."/>:visible.map(n=><Pressable key={n.id} accessibilityRole="button" onPress={()=>open(n)}><Card><View style={s.rowBetween}><Text style={[s.cardTitle,{color:n.is_read?C.muted:C.white,flex:1}]}>{n.message}</Text><Ionicons name="chevron-forward" size={18} color={C.muted}/></View><Text style={s.muted}>{formatPhilippineDateTime(n.created_at)}</Text></Card></Pressable>)}</Page>; }

function MessagesScreen({ navigation }: any) { const {user}=useAuth();const [rows,setRows]=useState<Conversation[]>([]); const [err,setErr]=useState(''); const load=useCallback(async()=>{try{setRows(await messaging.list())}catch(e){setErr(errorMessage(e))}},[]); useFocusEffect(useCallback(()=>{load()},[load])); return <Page topSafe onRefresh={load}><Heading title="Messages" subtitle="Conversations with buyers and sellers." />{err?<Status state={err} retry={load}/>:!rows.length?<Status state="No conversations yet. Message a seller from a listing."/>:rows.map(c=>{const person=c.starter_id===user?.id?c.recipient:c.starter;return <Pressable key={c.id} onPress={()=>navigation.navigate('Conversation',{id:c.id})}><Card><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:44,height:44,borderRadius:22,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'800',color:C.gold}}>{(person?.name||'U').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.cardTitle}>{person?.name||'UM-Pasa user'}</Text><Text numberOfLines={1} style={s.muted}>{c.latest_message?.body || c.item?.title || 'Open conversation'}</Text></View><Ionicons name="chevron-forward" size={18} color={C.muted}/></View>{c.item?.title?<Text style={[s.eyebrow,{marginTop:9}]}>ABOUT · {c.item.title}</Text>:null}</Card></Pressable>})}</Page>; }
function ConversationScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [c, setC] = useState<Conversation>();
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [meetupDate, setMeetupDate] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);
  const [proposing, setProposing] = useState(false);

  const load = useCallback(async () => {
    try {
      setC(await messaging.get(route.params.id));
    } catch(e) {
      Alert.alert('Unable to load conversation', errorMessage(e));
    }
  }, [route.params.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`conversation:${route.params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${route.params.id}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, route.params.id]);

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await messaging.send({ conversation_id: route.params.id, body: body.trim() });
      setBody('');
      await load();
    } catch(e) {
      Alert.alert('Message not sent', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const propose = async () => {
    if (!location.trim()) {
      Alert.alert('Missing location', 'Please enter a meetup location.');
      return;
    }
    if (!meetupDate) {
      Alert.alert('Missing schedule', 'Please select a meetup date and time.');
      return;
    }
    if (meetupDate.getTime() <= Date.now()) {
      Alert.alert('Invalid meetup time', 'Meetup time must be set in the future.');
      return;
    }
    if (proposing) return;
    setProposing(true);
    try {
      await messaging.send({
        conversation_id: route.params.id,
        type: 'meetup_proposal',
        meetup_location: location.trim(),
        meetup_time: meetupDate.toISOString(),
      });
      setLocation('');
      setMeetupDate(null);
      await load();
      Alert.alert('Proposal sent', 'The other participant was notified.');
    } catch(e) {
      Alert.alert('Proposal not sent', errorMessage(e));
    } finally {
      setProposing(false);
    }
  };

  const person=c?(c.starter_id===user?.id?c.recipient:c.starter):undefined;
  return <Page onRefresh={load}><Pressable accessibilityRole="button" onPress={()=>person&&navigation.navigate('ProfileReviews',{id:person.id,name:person.name,role:person.role})} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:8,marginBottom:10}}><View style={{width:42,height:42,borderRadius:21,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'}}><Text style={{color:C.gold,fontWeight:'800'}}>{(person?.name||'U').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.cardTitle}>{person?.name||'Conversation'}</Text><Text style={s.muted}>{c?.item?.title||'Tap to view profile and reviews'}</Text></View><Ionicons name="chevron-forward" size={18} color={C.muted}/></Pressable>{(c?.messages||[]).map(m=>{const mine=m.user_id===user?.id;const meta=m.meta as any;return <View key={m.id} style={{alignSelf:mine?'flex-end':'flex-start',maxWidth:'86%',backgroundColor:mine?(C.bg===themeTokens.dark.colors.bg?'#76211d':'#a92720'):C.panel2,borderRadius:18,borderBottomRightRadius:mine?5:18,borderBottomLeftRadius:mine?18:5,padding:12,marginVertical:4}}><Text style={{fontSize:12,fontWeight:'700',color:mine?'#ffe4bf':C.gold,marginBottom:4}}>{m.type==='meetup_proposal'?'Meetup proposal':m.type==='system'?'UM-Pasa update':m.user?.name||'Participant'}</Text><Text style={{color:mine?'#fff':C.white,fontSize:15,lineHeight:21}}>{m.body||''}</Text>{m.meetup_location?<Text style={{color:mine?'#fff':C.white,marginTop:6}}>📍 {m.meetup_location}</Text>:null}{m.meetup_time?<Text style={{color:mine?'#fff':C.white,marginTop:3}}>🗓 {formatPhilippineDateTime(m.meetup_time)}</Text>:null}<Text style={{color:mine?'#ffe4bf':C.muted,fontSize:10,marginTop:6,alignSelf:'flex-end'}}>{formatPhilippineTime(m.created_at)}</Text>{m.type==='meetup_proposal'&&m.proposal_status==='pending'&&!mine?<View style={[s.row,{marginTop:8}]}><Button title="Accept" onPress={async()=>{try{await messaging.respond(m.id,true);await load()}catch(e){Alert.alert('Unable to accept',errorMessage(e))}}}/><Button title="Decline" danger onPress={async()=>{try{await messaging.respond(m.id,false);await load()}catch(e){Alert.alert('Unable to decline',errorMessage(e))}}}/></View>:null}{m.proposal_status&&m.proposal_status!=='pending'?<Text style={{color:mine?'#ffe4bf':C.muted,marginTop:5}}>Proposal {m.proposal_status}</Text>:null}{m.proposal_status==='accepted'&&meta?.transaction_id?<Pressable onPress={()=>navigation.navigate('Transaction',{id:meta.transaction_id})}><Text style={{color:mine?'#fff':'#b42318',fontWeight:'800',marginTop:7}}>View transaction schedule ›</Text></Pressable>:null}</View>})}<View style={{flexDirection:'row',alignItems:'flex-end',gap:8,marginTop:12}}><TextInput value={body} onChangeText={setBody} placeholder="Message…" placeholderTextColor={C.muted} multiline style={{flex:1,minHeight:44,maxHeight:110,borderWidth:1,borderColor:C.border,borderRadius:22,paddingHorizontal:16,paddingVertical:11,color:C.white,backgroundColor:C.panel}}/><Pressable accessibilityRole="button" onPress={send} disabled={sending||!body.trim()} style={{width:46,height:46,borderRadius:23,alignItems:'center',justifyContent:'center',backgroundColor:C.red,opacity:(sending||!body.trim())?.55:1}}><Ionicons name="send" size={19} color="#fff"/></Pressable></View><Card style={{marginTop:16}}><Text style={s.section}>Propose a meetup</Text><Field label="Meetup location" value={location} onChangeText={setLocation} placeholder="e.g. Student Center"/><MeetupTimePicker label="Meetup date & time" value={meetupDate} onChange={setMeetupDate}/><Button title={proposing ? "Sending proposal…" : "Send meetup proposal"} disabled={proposing || !location.trim() || !meetupDate} secondary onPress={propose}/></Card></Page>;
}

function ReportsScreen() {
  const {user}=useAuth(); const [d,setD]=useState<any>(); const [err,setErr]=useState(''); const [status,setStatus]=useState(''); const [type,setType]=useState(''); const [category,setCategory]=useState(''); const [sort,setSort]=useState('newest');
  const load=useCallback(async()=>{try{setD(await account.report());setErr('')}catch(e){setErr(errorMessage(e))}},[]); useFocusEffect(useCallback(()=>{load()},[load]));
  if(err)return <Page><Status state={err} retry={load}/></Page>; if(!d)return <Page><ActivityIndicator color={C.gold}/></Page>;
  let items:Item[]=(d.items||[]).filter((i:Item)=>!type||i.listing_type===type).filter((i:Item)=>!category||i.category===category).filter((i:Item)=>!status||(status==='completed'?i.status==='sold':status==='pending'?i.status==='pending':true));
  let txs:Transaction[]=(d.transactions||[]).filter((t:Transaction)=>!status||t.status===status).filter((t:Transaction)=>!type||t.item?.listing_type===type).filter((t:Transaction)=>!category||t.item?.category===category);
  const byDate=(a:any,b:any)=>new Date(a.created_at||0).getTime()-new Date(b.created_at||0).getTime();
  items=[...items].sort((a,b)=>sort==='oldest'?byDate(a,b):sort==='title'?a.title.localeCompare(b.title):sort==='status'?a.status.localeCompare(b.status):byDate(b,a));
  txs=[...txs].sort((a,b)=>sort==='oldest'?byDate(a,b):sort==='status'?a.status.localeCompare(b.status):byDate(b,a));
  const categoryNames=Array.from(new Set([...(d.items||[]).map((i:Item)=>i.category),...(d.transactions||[]).map((t:Transaction)=>t.item?.category)].filter(Boolean)));
  const studentSummary={listed:items.length,approved_listings:items.filter(i=>i.moderation_status==='approved').length,transactions:txs.length,completed:txs.filter(t=>t.status==='completed').length,earned:txs.filter(t=>t.seller_id===user?.id&&t.status==='completed').reduce((sum,t)=>sum+Number(t.item?.price||0),0)};
  return <Page onRefresh={load}><Heading title="My report" subtitle="Listings and transactions linked to your account."/><View style={s.stats}>{Object.entries(studentSummary).map(([k,v])=><Card key={k} style={s.stat}><Text style={s.statNum}>{String(v)}</Text><Text style={s.muted}>{k.replaceAll('_',' ')}</Text></Card>)}</View><Text style={s.label}>Transaction status</Text><View style={s.rowWrap}><Choice label="All statuses" selected={!status} onPress={()=>setStatus('')}/>{['pending','approved','rejected','completed'].map(v=><Choice key={v} label={v} selected={status===v} onPress={()=>setStatus(status===v?'':v)}/>)}</View><Text style={s.label}>Listing type</Text><View style={s.row}><Choice label="Sales and rentals" selected={!type} onPress={()=>setType('')}/><Choice label="Sale" selected={type==='sell'} onPress={()=>setType(type==='sell'?'':'sell')}/><Choice label="Rental" selected={type==='rent'} onPress={()=>setType(type==='rent'?'':'rent')}/></View><Text style={s.label}>Category</Text><View style={s.rowWrap}><Choice label="All categories" selected={!category} onPress={()=>setCategory('')}/>{categoryNames.map(v=><Choice key={v} label={v} selected={category===v} onPress={()=>setCategory(category===v?'':(v||''))}/>)}</View><Text style={s.label}>Sort</Text><View style={s.rowWrap}>{['newest','oldest','title','status'].map(v=><Choice key={v} label={v} selected={sort===v} onPress={()=>setSort(v)}/>)}</View><Heading title="Listings"/>{items.length?items.map(i=><Card key={i.id}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.muted}>{i.category} · {i.listing_type} · {i.status} / {i.moderation_status}{i.created_at ? ` · ${formatPhilippineDate(i.created_at)}` : ''}</Text><Text style={s.price}>{money(i.price)}</Text></Card>):<Status state="No listings match these report filters."/>}<Heading title="Transactions"/>{txs.length?txs.map(t=><Card key={t.id}><Text style={s.cardTitle}>{t.item?.title||'Transaction'}</Text><Text style={s.muted}>{t.status} · {t.buyer?.name} / {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text></Card>):<Status state="No transactions match these report filters."/>}</Page>;
}

function AboutScreen() { return <Page><Heading title="About UM-Pasa" subtitle="Academic resource marketplace"/><Card><Text style={s.section}>System purpose</Text><Text style={s.body}>UM-Pasa helps UM students list academic items, request sale or rental transactions, coordinate safely through messages, upload payment proof, and track transactions from request to completion.</Text></Card><Card><Text style={s.section}>Project information</Text><Text style={s.body}>PASA Development Team</Text><Text style={s.muted}>Student developers and system publishers of UM-Pasa.</Text><Text style={s.body}>Institution</Text><Text style={s.muted}>Department of Computing Education · Information Technology Program · UM Tagum College - Visayan Campus</Text></Card><Card><Text style={s.section}>Marketplace principles</Text><Text style={s.body}>Student-centered listings · Traceable transactions · Admin moderated resources · Sale and rental support</Text></Card></Page>; }
function HelpScreen() { return <Page><Heading title="How UM-Pasa works" subtitle="A simple guide for buyers and sellers."/><Card><Text style={s.section}>For sellers</Text><Text style={s.body}>1. Create a sale or rental listing and choose payment methods.</Text><Text style={s.body}>2. Wait for an administrator to review the listing.</Text><Text style={s.body}>3. Respond to buyer requests. Approve with a meetup place and time, or reject the request.</Text><Text style={s.body}>4. After an approved exchange, mark the transaction completed. For a sale with no open request, mark the approved listing sold from My Listings.</Text><Text style={s.body}>5. Leave a review for the buyer after the exchange is complete.</Text></Card><Card><Text style={s.section}>For buyers</Text><Text style={s.body}>1. Browse the two-column marketplace, search, or use filters.</Text><Text style={s.body}>2. Open a listing and request it using a payment option accepted by the seller.</Text><Text style={s.body}>3. Coordinate the campus meetup in Messages and upload payment proof when applicable.</Text><Text style={s.body}>4. Confirm completion and review the seller.</Text></Card><Card><Text style={s.section}>Listings and safety</Text><Text style={s.body}>Listings need administrator approval before they appear in Browse. Coordinate a safe university meetup. Sale listings with an open transaction must resolve it before they can be manually marked sold.</Text></Card></Page>; }
function AdminScreen({ navigation }: any) { return <Page topSafe><Heading title="Admin" subtitle="Moderation and platform records."/><Button title="Review listings" onPress={()=>navigation.navigate('AdminItems')}/><Button title="Users" secondary onPress={()=>navigation.navigate('AdminUsers')}/><Button title="All transactions" secondary onPress={()=>navigation.navigate('AdminTransactions')}/><Button title="Platform report" secondary onPress={()=>navigation.navigate('AdminReport')}/><Text style={s.muted}>Report totals are summarized from the existing admin records.</Text></Page>; }
function ProfileReviewsScreen({route}:any) { const [reviews,setReviews]=useState<any[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const load=useCallback(async()=>{setLoading(true);try{setReviews(await profiles.reviews(route.params.id));setError('')}catch(e){setError(errorMessage(e))}finally{setLoading(false)}},[route.params.id]);useEffect(()=>{load()},[load]);const average=reviews.length?reviews.reduce((sum,r)=>sum+Number(r.rating),0)/reviews.length:0;return <Page onRefresh={load} refreshing={loading}><Heading title={route.params.name||'UM-Pasa user'} subtitle={`${route.params.role==='admin'?'Administrator':'Student'} · reviews from completed exchanges`}/><Card><Text style={s.statNum}>{reviews.length?`${average.toFixed(1)} ★`: '—'}</Text><Text style={s.muted}>{reviews.length} review{reviews.length===1?'':'s'}</Text></Card>{error?<Status state={error} retry={load}/>:loading?<ActivityIndicator color={C.gold}/>:reviews.length?reviews.map(r=><Card key={r.review_id}><View style={s.rowBetween}><Text style={s.cardTitle}>{'★'.repeat(Number(r.rating))}{'☆'.repeat(5-Number(r.rating))}</Text><Text style={s.muted}>{formatPhilippineDate(r.created_at)}</Text></View><Text style={s.body}>{r.comment||'No written comment.'}</Text><Text style={s.muted}>From {r.reviewer_name||'UM-Pasa user'}{r.item_title?` · ${r.item_title}`:''}</Text></Card>):<Status state="This user has no reviews yet."/>}</Page>; }
function AdminItemsScreen({route}:any) {
  const [rows,setRows]=useState<Item[]>([]); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const [expandedId,setExpandedId]=useState<string|null>(route?.params?.itemId||null);
  const [rejectionTarget,setRejectionTarget]=useState<string|null>(null); const [rejectionReason,setRejectionReason]=useState('');
  const load=useCallback(async()=>{setBusy(true);try{setRows(await admin.items());setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);
  useEffect(()=>{load()},[load]);
  const moderate=async(id:string,a:'approve'|'reject',reason?:string)=>{try{await admin.moderate(id,a,reason);setRejectionTarget(null);setRejectionReason('');await load()}catch(e){Alert.alert('Moderation failed',errorMessage(e))}};
  const pending=rows.filter((item)=>item.moderation_status==='pending');
  return <Page onRefresh={load} refreshing={busy}><Heading title="Listing review" subtitle={`${pending.length} listing${pending.length===1?'':'s'} awaiting a decision.`}/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.red}/>:!pending.length?<Status state="No listings to review."/>:pending.map(i=><Card key={i.id}>
    <Pressable accessibilityRole="button" onPress={()=>setExpandedId(expandedId===i.id?null:i.id)}><View style={s.rowBetween}><View style={{flex:1}}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.muted}>{i.user?.name||'UM student'} · {i.category} · {money(i.price)}</Text></View><View style={{alignItems:'flex-end'}}><Text style={[s.badge,{color:C.gold}]}>PENDING</Text><Ionicons name={expandedId===i.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/></View></View></Pressable>
    {expandedId===i.id&&<>
    {i.image?<Image source={{uri:imageUrl(i.image)}} style={s.adminListingImage} resizeMode="cover"/>:null}
    <Text style={s.adminPrice}>{money(i.price)}{i.listing_type==='rent'?' / day':''} · {i.listing_type==='rent'?'For rent':'For sale'}</Text>
    <Text style={s.body}>{i.description}</Text>
    <View style={s.adminDetails}><Text style={s.adminDetail}>Category: {i.category}</Text><Text style={s.adminDetail}>Condition: {i.condition?.replaceAll('_',' ')}</Text><Text style={s.adminDetail}>Course: {i.course_code}</Text><Text style={s.adminDetail}>Department: {i.department}</Text>{i.program?<Text style={s.adminDetail}>Program: {i.program}</Text>:null}<Text style={s.adminDetail}>Seller: {i.user?.name||'UM student'}</Text><Text style={s.adminDetail}>Submitted: {i.created_at?formatPhilippineDate(i.created_at): 'Date unavailable'}</Text></View>
    <View style={s.row}><Button title="Approve" onPress={()=>moderate(i.id,'approve')}/><Button title="Reject" danger onPress={()=>{setRejectionTarget(rejectionTarget===i.id?null:i.id);setRejectionReason('')}}/></View>
    {rejectionTarget===i.id&&<View style={s.rejectPanel}><Field label="Reason for rejection (required)" value={rejectionReason} onChangeText={setRejectionReason} multiline/><Button title="Send rejection with reason" danger disabled={!rejectionReason.trim()} onPress={()=>moderate(i.id,'reject',rejectionReason.trim())}/></View>}
    </>}
  </Card>)}</Page>;
}
function AdminUsersScreen() { const [rows,setRows]=useState<User[]>([]); const [err,setErr]=useState(''); const [busy,setBusy]=useState(true); const load=useCallback(async()=>{setBusy(true);try{setRows(await admin.users());setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]); return <Page onRefresh={load} refreshing={busy}><Heading title="Users"/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:rows.map(u=><Card key={u.id}><Text style={s.cardTitle}>{u.name}</Text><Text style={s.muted}>{u.email} · {u.role}</Text></Card>)}</Page>; }
function TransactionSummary({t}: {t:Transaction}) { return <View style={s.adminDetails}><Text style={s.adminDetail}>Buyer: {t.buyer?.name||'—'}</Text><Text style={s.adminDetail}>Seller: {t.seller?.name||'—'}</Text><Text style={s.adminDetail}>Listing: {t.item?.title||'—'} · {t.item?.category||'—'} · {t.item?.listing_type||'—'}</Text><Text style={s.adminDetail}>Payment: {t.payment_method?.replaceAll('_',' ')||'—'}{t.other_payment_method?` (${t.other_payment_method})`:''}</Text><Text style={s.adminDetail}>Rental duration: {t.rental_duration_days?`${t.rental_duration_days} days`:'Not applicable'}</Text><Text style={s.adminDetail}>Rental due: {formatPhilippineDate(t.rental_due_date, 'Not set')}</Text><Text style={s.adminDetail}>Meetup place: {t.meetup_location||'Not scheduled'}</Text><Text style={s.adminDetail}>Meetup time: {formatPhilippineDateTime(t.meetup_time, 'Not scheduled')}</Text><Text style={s.adminDetail}>Payment proof: {t.payment_proof_uploaded_at?`Uploaded ${formatPhilippineDateTime(t.payment_proof_uploaded_at)}`:'Not uploaded'}</Text><Text style={s.adminDetail}>Created: {formatPhilippineDateTime(t.created_at, '—')}</Text></View>; }
function AdminTransactionsScreen() { const [rows,setRows]=useState<Transaction[]>([]); const [err,setErr]=useState(''); const [busy,setBusy]=useState(true);const [expandedId,setExpandedId]=useState<string|null>(null); const load=useCallback(async()=>{setBusy(true);try{setRows(await admin.transactions());setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]); return <Page onRefresh={load} refreshing={busy}><Heading title="All transactions" subtitle="Tap a transaction to see its complete report."/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:rows.map(t=><Card key={t.id}><Pressable accessibilityRole="button" onPress={()=>setExpandedId(expandedId===t.id?null:t.id)}><View style={s.rowBetween}><Text style={[s.cardTitle,{flex:1}]}>{t.item?.title||'Transaction'}</Text><Ionicons name={expandedId===t.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/></View><Text style={s.muted}>{t.status} · {t.buyer?.name} / {t.seller?.name}</Text></Pressable>{expandedId===t.id&&<TransactionSummary t={t}/>}</Card>)}</Page>; }
function AdminReportScreen() {
  const [items,setItems]=useState<Item[]>([]);const [txs,setTxs]=useState<Transaction[]>([]);const [err,setErr]=useState('');const [busy,setBusy]=useState(true);const [status,setStatus]=useState('');const [type,setType]=useState('');const [category,setCategory]=useState('');const [sort,setSort]=useState('newest');const [expandedTxId,setExpandedTxId]=useState<string|null>(null);
  const load=useCallback(async()=>{setBusy(true);try{const [i,t]=await Promise.all([admin.items(),admin.transactions()]);setItems(i);setTxs(t);setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]);
  const reportItems=[...items.filter(i=>!type||i.listing_type===type).filter(i=>!category||i.category===category).filter(i=>!status||(status==='completed'?i.status==='sold':status==='pending'?i.status==='pending':true))].sort((a,b)=>sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):sort==='title'?a.title.localeCompare(b.title):sort==='status'?a.status.localeCompare(b.status):String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const reportTxs=[...txs.filter(t=>!status||t.status===status).filter(t=>!type||t.item?.listing_type===type).filter(t=>!category||t.item?.category===category)].sort((a,b)=>sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):sort==='status'?a.status.localeCompare(b.status):String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const categories=Array.from(new Set([...items.map(i=>i.category),...txs.map(t=>t.item?.category)].filter(Boolean)));
  const summary={items:reportItems.length,pendingListings:reportItems.filter(i=>i.moderation_status==='pending').length,approvedListings:reportItems.filter(i=>i.moderation_status==='approved').length,transactions:reportTxs.length,completed:reportTxs.filter(t=>t.status==='completed').length,gcash:reportTxs.filter(t=>t.payment_method==='gcash').length};
  return <Page refreshing={busy} onRefresh={load}><Heading title="Platform report" subtitle="Filter and review platform listings and transactions."/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:<><View style={s.stats}>{Object.entries(summary).map(([k,v])=><Card key={k} style={s.stat}><Text style={s.statNum}>{String(v)}</Text><Text style={s.muted}>{k.replaceAll(/[A-Z]/g,m=>` ${m.toLowerCase()}`)}</Text></Card>)}</View><Text style={s.label}>Status</Text><View style={s.rowWrap}><Choice label="All statuses" selected={!status} onPress={()=>setStatus('')}/>{['pending','approved','rejected','completed'].map(v=><Choice key={v} label={v} selected={status===v} onPress={()=>setStatus(status===v?'':v)}/>)}</View><Text style={s.label}>Type</Text><View style={s.row}><Choice label="Sales and rentals" selected={!type} onPress={()=>setType('')}/><Choice label="Sales" selected={type==='sell'} onPress={()=>setType(type==='sell'?'':'sell')}/><Choice label="Rentals" selected={type==='rent'} onPress={()=>setType(type==='rent'?'':'rent')}/></View><Text style={s.label}>Category</Text><View style={s.rowWrap}><Choice label="All categories" selected={!category} onPress={()=>setCategory('')}/>{categories.map(v=><Choice key={v} label={v} selected={category===v} onPress={()=>setCategory(category===v?'':(v||''))}/>)}</View><Text style={s.label}>Sort</Text><View style={s.rowWrap}>{['newest','oldest','title','status'].map(v=><Choice key={v} label={v} selected={sort===v} onPress={()=>setSort(v)}/>)}</View><Heading title="Listings"/>{reportItems.length?reportItems.map(i=><Card key={i.id}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.muted}>{i.user?.name} · {i.category} · {i.listing_type} · {i.status}/{i.moderation_status}{i.created_at ? ` · ${formatPhilippineDate(i.created_at)}` : ''}</Text><Text style={s.price}>{money(i.price)}</Text></Card>):<Status state="No listings match these report filters."/>}<Heading title="Transactions"/>{reportTxs.length?reportTxs.map(t=><Card key={t.id}><Pressable accessibilityRole="button" onPress={()=>setExpandedTxId(expandedTxId===t.id?null:t.id)}><View style={s.rowBetween}><Text style={[s.cardTitle,{flex:1}]}>{t.item?.title||'Transaction'}</Text><Ionicons name={expandedTxId===t.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/></View><Text style={s.muted}>{t.status} · {t.buyer?.name} / {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text></Pressable>{expandedTxId===t.id&&<TransactionSummary t={t}/>}</Card>):<Status state="No transactions match these report filters."/>}</>}</Page>;
}

function TabsRoot() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const icons: Record<string, any> = {
    Home: 'grid-outline',
    Browse: 'search-outline',
    Messages: 'chatbubble-ellipses-outline',
    Transactions: 'swap-horizontal-outline',
    Profile: 'person-circle-outline',
    Admin: 'shield-checkmark-outline',
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          s.tabBar,
          {
            height: 56 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 6),
            paddingTop: 4,
          },
        ],
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 0,
        },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: isAdmin ? 9.5 : 10.5,
          letterSpacing: -0.3,
          marginHorizontal: -2,
        },
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name]} size={isAdmin ? 21 : size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      <Tabs.Screen name="Messages" component={MessagesScreen} />
      <Tabs.Screen name="Transactions" component={TransactionsScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
      {isAdmin && <Tabs.Screen name="Admin" component={AdminScreen} />}
    </Tabs.Navigator>
  );
}
function AppStack({ authenticated, isAdmin }: { authenticated: boolean; isAdmin: boolean }) {
  return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:C.panel},headerTintColor:C.white,headerTitleStyle:{fontWeight:'800',fontSize:15},headerShadowVisible:false,contentStyle:{backgroundColor:C.bg}}}>
    {authenticated
      ? <Stack.Screen name="Main" component={TabsRoot} options={{headerShown:false}} />
      : <>
          <Stack.Screen name="Browse" component={BrowseScreen} options={{title:'UM-Pasa Marketplace'}} />
          <Stack.Screen name="Login" component={LoginScreen} options={{title:'Sign in'}} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{title:'Create account'}} />
        </>}
    <Stack.Screen name="About" component={AboutScreen}/>
    <Stack.Screen name="Help" component={HelpScreen}/>
    <Stack.Screen name="Listing" component={ListingScreen} options={{title:'Listing details'}}/>
    {authenticated&&<>
      <Stack.Screen name="ListingForm" component={ListingFormScreen} options={{title:'Manage listing'}}/>
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{title:'My listings'}}/>
      <Stack.Screen name="Transaction" component={TransactionScreen} options={{title:'Transaction'}}/>
      <Stack.Screen name="Notifications" component={NotificationsScreen}/>
      <Stack.Screen name="Conversation" component={ConversationScreen}/>
      <Stack.Screen name="ProfileReviews" component={ProfileReviewsScreen} options={{title:'Reviews'}}/>
      <Stack.Screen name="Reports" component={ReportsScreen}/>
      {isAdmin&&<>
        <Stack.Screen name="AdminItems" component={AdminItemsScreen} options={{title:'Listing review'}}/>
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen}/>
        <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen}/>
        <Stack.Screen name="AdminReport" component={AdminReportScreen}/>
      </>}
    </>}
  </Stack.Navigator>;
}

function AppContent() {
  const { user, authUser, profile, loading, profileError, refreshProfile, logout } = useAuth();
  if (loading) return <SafeAreaView style={s.loading}><ActivityIndicator color={C.gold}/><Text style={s.muted}>Restoring your UM-Pasa session…</Text></SafeAreaView>;
  if (authUser && !profile) return <SafeAreaView style={s.loading}>
    <Heading title="Profile unavailable" subtitle={profileError || 'Your account exists, but its UM-Pasa profile could not be loaded.'}/>
    <Button title="Retry profile" onPress={() => refreshProfile().catch(() => undefined)}/>
    <Button title="Sign out" secondary onPress={() => logout().catch(() => undefined)}/>
  </SafeAreaView>;
  return <NavigationContainer key={user ? 'signed-in' : 'guest'}>
    <AppStack authenticated={!!user} isAdmin={user?.role === 'admin'}/>
  </NavigationContainer>;
}

function ThemedApp() {
  const { mode } = useTheme();
  T = themeTokens[mode];
  C = palettes[mode];
  s = createStyles();
  useEffect(() => { Appearance.setColorScheme(mode); }, [mode]);
  return <SafeAreaProvider style={{ flex: 1, backgroundColor: C.bg }}><StatusBar barStyle={mode==='dark'?'light-content':'dark-content'} backgroundColor={C.bg}/><AuthProvider><AppContent /></AuthProvider></SafeAreaProvider>;
}

export default function App() {
  return <ThemeProvider><ThemedApp /></ThemeProvider>;
}

function createStyles(_tokens?: ThemeTokens) { return StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  page:{padding:14,paddingTop:10,paddingBottom:28},
  authSafe:{flex:1,backgroundColor:C.bg},
  authPage:{flexGrow:1,justifyContent:'center',padding:24,paddingBottom:44},
  logo:{width:170,height:110,alignSelf:'center',marginBottom:4},
  tagline:{textAlign:'center',letterSpacing:2.2,color:C.gold,fontWeight:'800',fontSize:10,marginBottom:24},
  heading:{fontSize:23,fontWeight:'900',color:C.white,marginBottom:5,letterSpacing:-.3},
  subheading:{fontSize:13,color:C.cream,lineHeight:19},
  section:{fontSize:16,fontWeight:'800',color:C.white,marginBottom:10},
  body:{fontSize:14,color:C.cream,lineHeight:21,marginVertical:5},
  muted:{fontSize:13,color:C.muted,lineHeight:19,marginTop:5},
  eyebrow:{fontSize:10,letterSpacing:1.6,fontWeight:'900',color:C.gold,textTransform:'uppercase'},
  cardTitle:{fontSize:15,fontWeight:'800',color:C.white,marginVertical:6},
  price:{fontSize:18,fontWeight:'900',color:C.gold,marginVertical:6},
  badge:{fontSize:10,fontWeight:'900',letterSpacing:1.1,textTransform:'uppercase'},
  card:{borderColor:C.border,borderWidth:1,borderRadius:15,padding:12,marginBottom:11,overflow:'hidden',shadowColor:'#000000',shadowOpacity:C.bg===themeTokens.dark.colors.bg?.22:.08,shadowRadius:9,shadowOffset:{width:0,height:3},elevation:2},
  fieldWrap:{marginBottom:12},
  label:{color:C.cream,fontWeight:'700',fontSize:13,marginBottom:6},
  field:{color:C.white,backgroundColor:C.input,borderColor:C.border,borderWidth:1,borderRadius:11,paddingHorizontal:12,paddingVertical:10,fontSize:14,minHeight:44},
  buttonShell:{borderRadius:14,overflow:'hidden',marginVertical:6,minHeight:48,shadowColor:'#b70201',shadowOpacity:.23,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:3},
  button:{paddingHorizontal:16,paddingVertical:14,alignItems:'center',justifyContent:'center',minHeight:48},
  buttonSecondary:{borderWidth:1,borderColor:C.bg===themeTokens.dark.colors.bg?'rgba(246,200,76,.32)':'rgba(138,101,0,.45)',shadowOpacity:0},
  buttonDanger:{borderColor:'#a61111'},
  buttonText:{color:'#ffffff',fontSize:13,fontWeight:'800',letterSpacing:.1},
  link:{textAlign:'center',color:C.gold,fontWeight:'800',marginTop:18,padding:8},
  authNote:{textAlign:'center',color:C.muted,fontSize:12,lineHeight:18,marginTop:16},
  error:{color:C.bg===themeTokens.dark.colors.bg?'#ff8c82':C.red,fontSize:14,marginBottom:12},
  row:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  rowWrap:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12},
  chip:{borderRadius:14,borderWidth:1,borderColor:C.border,paddingHorizontal:11,paddingVertical:8,backgroundColor:C.chip,marginRight:3},
  chipSelected:{backgroundColor:C.bg===themeTokens.dark.colors.bg?'#490d0d':'#fff0ed',borderColor:'#e62424',shadowColor:'#e62424',shadowOpacity:.08,shadowRadius:4,elevation:1},
  chipText:{fontSize:12,color:C.cream,fontWeight:'700',textTransform:'capitalize'},
  stats:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},
  stat:{width:'48%',marginBottom:0,alignItems:'center',justifyContent:'center',minHeight:90},
  statNum:{fontSize:25,fontWeight:'900',color:C.gold},
  tabBar:{backgroundColor:C.panel,borderTopColor:C.border,borderTopWidth:1,height:62,paddingBottom:6,paddingTop:5,elevation:10},
  loading:{flex:1,backgroundColor:C.bg,justifyContent:'center',alignItems:'center',gap:12},
  loadingBlock:{padding:24,alignItems:'center'},
  heroImage:{width:'100%',height:230,borderRadius:15,marginBottom:12,backgroundColor:C.panel},
  barTrack:{height:7,backgroundColor:C.panel2,borderRadius:5,overflow:'hidden',marginTop:5},
  barFill:{height:7,backgroundColor:C.red,borderRadius:5},
  marketHero:{position:'relative',overflow:'hidden',borderRadius:25,borderWidth:1,borderColor:'rgba(246,200,76,.2)',marginBottom:16,shadowColor:'#b70201',shadowOpacity:.18,shadowRadius:22,shadowOffset:{width:0,height:10},elevation:6},
  marketHeroGradient:{padding:20,paddingBottom:18},
  heroGlow:{position:'absolute',width:190,height:190,borderRadius:100,right:-95,bottom:-95,backgroundColor:'rgba(230,36,36,.14)'},
  brandRow:{flexDirection:'row',alignItems:'center',gap:11},
  brandMark:{width:46,height:46,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.1)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',overflow:'hidden'},
  brandLogo:{width:42,height:42},
  brandName:{fontSize:16,color:'#ffffff',fontWeight:'900',letterSpacing:.2},
  brandCaption:{fontSize:8,color:'#e9c8a7',letterSpacing:1.5,fontWeight:'800',marginTop:2},
  signInPill:{paddingHorizontal:14,paddingVertical:9,borderRadius:13,borderWidth:1,borderColor:'rgba(246,200,76,.55)',backgroundColor:'rgba(18,15,17,.45)'},
  signInText:{color:C.gold,fontSize:12,fontWeight:'800'},
  heroCopy:{marginTop:23},
  heroKicker:{fontSize:9,color:'#f6c84c',fontWeight:'900',letterSpacing:2.2,marginBottom:8},
  heroTitle:{color:'#ffffff',fontSize:27,fontWeight:'900',letterSpacing:-.55,lineHeight:33,maxWidth:330},
  heroGold:{color:'#ffc270'},
  heroDescription:{fontSize:12,color:'#f1dcc0',lineHeight:18,marginTop:6,marginBottom:8,maxWidth:310},
  heroActions:{flexDirection:'row',alignItems:'center',gap:12,marginTop:17},
  heroLink:{fontSize:11,color:'#f5d99e',fontWeight:'700'},
  heroDivider:{height:14,width:1,backgroundColor:'rgba(255,255,255,.25)'},
  searchPanel:{padding:14,marginBottom:22,borderRadius:19},
  searchLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:1.25,marginBottom:8},
  searchRow:{flexDirection:'row',alignItems:'center',gap:8},
  searchInput:{flex:1,minWidth:0,color:C.white,backgroundColor:C.input,borderWidth:1,borderColor:C.border,borderRadius:11,paddingHorizontal:12,paddingVertical:10,fontSize:14,minHeight:44},
  searchButton:{width:48,height:48,borderRadius:13,overflow:'hidden'},
  searchButtonGradient:{flex:1,alignItems:'center',justifyContent:'center'},
  searchButtonText:{fontSize:11,color:'#ffffff',fontWeight:'900',letterSpacing:.8},
  searchHint:{color:C.muted,fontSize:11,marginTop:8},
  sectionTop:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:12},
  sectionKicker:{fontSize:9,color:C.gold,fontWeight:'900',letterSpacing:1.8,marginBottom:3},
  sectionTitle:{fontSize:20,color:C.white,fontWeight:'900',letterSpacing:-.3},
  resultCount:{fontSize:11,color:C.muted,marginBottom:3},
  filterLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:1.2,marginBottom:7,marginTop:5},
  chipStrip:{paddingBottom:6,paddingRight:10},
  sortRow:{marginTop:3,marginBottom:5},
  sortChoices:{flexDirection:'row',alignItems:'center',paddingBottom:4},
  filterToggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:11,marginTop:4,marginBottom:12,borderRadius:13,backgroundColor:C.panel,borderWidth:1,borderColor:C.border},
  filterToggleTitle:{fontSize:13,color:C.white,fontWeight:'800'},
  filterToggleHint:{fontSize:11,color:C.muted,marginTop:3},
  filterChevron:{fontSize:22,color:C.gold,fontWeight:'500',paddingHorizontal:5},
  advancedFilters:{padding:14,marginTop:-5,marginBottom:15},
  itemCard:{marginBottom:8,borderRadius:13,padding:9},
  listingImage:{width:'100%',height:155,borderRadius:10,marginTop:10,backgroundColor:C.panel2},
  listingImageCompact:{height:104,marginTop:7},
  listingImagePlaceholder:{width:'100%',height:85,borderRadius:10,marginTop:8,marginBottom:4,backgroundColor:C.soft,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  listingImagePlaceholderCompact:{height:75},
  listingGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start'},
  gridItem:{marginBottom:8},
  cardTitleCompact:{fontSize:13,lineHeight:17,marginVertical:4},
  mutedCompact:{fontSize:10,lineHeight:14,marginTop:2},
  priceCompact:{fontSize:14,marginVertical:4},
  notificationFab:{position:'absolute',right:20,bottom:24,width:52,height:52,borderRadius:26,backgroundColor:'#e62424',alignItems:'center',justifyContent:'center',elevation:8,shadowColor:'#7d1111',shadowOpacity:.25,shadowRadius:8,shadowOffset:{width:0,height:4}},
  notificationCount:{position:'absolute',right:-2,top:-3,minWidth:19,height:19,borderRadius:10,backgroundColor:'#f6ad2f',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.panel,paddingHorizontal:3},
  notificationCountText:{fontSize:9,fontWeight:'900',color:'#1d1617'},
  soldButton:{paddingVertical:8,paddingHorizontal:8,alignItems:'center',borderRadius:9,backgroundColor:C.dangerSoft,borderWidth:1,borderColor:C.border},
  soldButtonText:{fontSize:11,fontWeight:'800',color:C.bg===themeTokens.dark.colors.bg?'#ff8c82':C.red},
  adminListingImage:{width:'100%',height:170,borderRadius:11,marginBottom:8,backgroundColor:C.panel2},
  adminPrice:{fontSize:13,fontWeight:'800',color:C.gold,marginBottom:4},
  adminDetails:{padding:10,borderRadius:10,backgroundColor:C.soft,marginTop:7,marginBottom:8},
  adminDetail:{fontSize:12,color:C.cream,lineHeight:18},
  rejectPanel:{marginTop:7,padding:10,borderRadius:11,backgroundColor:C.dangerSoft,borderWidth:1,borderColor:C.border},
  heroCarousel:{marginTop:15,marginHorizontal:-4},
  carouselSlide:{minHeight:158,paddingHorizontal:5,paddingVertical:3,justifyContent:'center'},
  carouselDots:{flexDirection:'row',gap:5,alignSelf:'center',marginTop:5},
  carouselDot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,.38)'},
  carouselDotActive:{width:17,backgroundColor:'#ffc270'},
  placeholderCategory:{color:C.cream,fontSize:12,fontWeight:'700',letterSpacing:.3},
  itemCardBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:2},
  sellerName:{fontSize:11,color:C.cream,fontWeight:'700'},
  footer:{marginTop:18,marginBottom:8,padding:15,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.panel,overflow:'hidden',shadowColor:'#000000',shadowOpacity:.07,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},
  footerBrand:{flexDirection:'row',alignItems:'center',gap:11},
  footerLogoRing:{width:49,height:49,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.08)',borderColor:'rgba(255,255,255,.14)',borderWidth:1},
  footerLogo:{width:43,height:43},
  footerTitle:{fontSize:17,color:C.white,fontWeight:'900'},
  footerCopy:{color:C.muted,fontSize:12,lineHeight:19,marginTop:12},
  footerRule:{height:1,backgroundColor:C.border,marginVertical:12},
  footerLinks:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8},
  footerPill:{paddingHorizontal:11,paddingVertical:8,borderRadius:11,borderWidth:1,borderColor:C.border,backgroundColor:C.soft},
  footerLinkText:{fontSize:10,color:C.cream,fontWeight:'700'},
  footerStep:{color:C.cream,fontSize:11,lineHeight:19,marginTop:4},
  footerBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:7,marginTop:12},
  footerCopyright:{color:C.muted,fontSize:9},
  footerBadge:{color:C.gold,fontSize:9,fontWeight:'700',borderRadius:9,borderWidth:1,borderColor:'rgba(246,200,76,.25)',paddingHorizontal:8,paddingVertical:5}
}); }
let s = createStyles();
