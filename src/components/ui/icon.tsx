import type { SvgProps } from 'react-native-svg';

import Account from '@/assets/icons/account.svg';
import Bolt from '@/assets/icons/bolt.svg';
import Card from '@/assets/icons/card.svg';
import CheckCircle from '@/assets/icons/check-circle.svg';
import ChevronDown from '@/assets/icons/chevron-down.svg';
import ChevronRight from '@/assets/icons/chevron-right.svg';
import ClipboardList from '@/assets/icons/clipboard-list.svg';
import Cylinder from '@/assets/icons/cylinder.svg';
import EmptyCircle from '@/assets/icons/empty-circle.svg';
import Export from '@/assets/icons/export.svg';
import Home from '@/assets/icons/home.svg';
import Inspect from '@/assets/icons/inspect.svg';
import InventoryAudit from '@/assets/icons/inventory-audit.svg';
import Menu from '@/assets/icons/menu.svg';
import More from '@/assets/icons/more.svg';
import Package from '@/assets/icons/package.svg';
import People from '@/assets/icons/people.svg';
import PeopleGroup from '@/assets/icons/people-group.svg';
import Plus from '@/assets/icons/plus.svg';
import PlusCircle from '@/assets/icons/plus-circle.svg';
import Refill from '@/assets/icons/refill.svg';
import Refresh from '@/assets/icons/refresh.svg';
import Search from '@/assets/icons/search.svg';
import Tank from '@/assets/icons/tank.svg';
import TransactionPlus from '@/assets/icons/transaction-plus.svg';
import TrendArrow from '@/assets/icons/trend-arrow.svg';
import Truck from '@/assets/icons/truck.svg';
import Wallet from '@/assets/icons/wallet.svg';
import Warehouse from '@/assets/icons/warehouse.svg';
import WarningTriangle from '@/assets/icons/warning-triangle.svg';

const icons = {
  account: Account,
  bolt: Bolt,
  card: Card,
  'check-circle': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'clipboard-list': ClipboardList,
  cylinder: Cylinder,
  'empty-circle': EmptyCircle,
  export: Export,
  home: Home,
  inspect: Inspect,
  'inventory-audit': InventoryAudit,
  menu: Menu,
  more: More,
  package: Package,
  people: People,
  'people-group': PeopleGroup,
  plus: Plus,
  'plus-circle': PlusCircle,
  refill: Refill,
  refresh: Refresh,
  search: Search,
  tank: Tank,
  'transaction-plus': TransactionPlus,
  'trend-arrow': TrendArrow,
  truck: Truck,
  wallet: Wallet,
  warehouse: Warehouse,
  'warning-triangle': WarningTriangle,
} satisfies Record<string, React.FC<SvgProps>>;

export type IconName = keyof typeof icons;

interface IconProps extends SvgProps {
  name: IconName;
}

export function Icon({ name, ...rest }: IconProps) {
  const Component = icons[name];
  return <Component {...rest} />;
}
