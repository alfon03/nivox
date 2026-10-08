import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileConnections } from "@/lib/social";
import { MaterialIcon } from "@/components/MaterialIcon";

type Props = { params: Promise<{ username: string }> };

export default async function FollowingPage({ params }: Props) {
  const { username } = await params;
  const data = await getProfileConnections(username, "following");
  if (!data) notFound();
  return <div className="shell pageStack narrowSocialPage"><Link className="backLink" href={`/usuarios/${data.profile.username}`}><MaterialIcon name="arrow_back" size={17}/>@{data.profile.username}</Link><div className="sectionTitle"><h1>Siguiendo</h1><span>{data.people.length}</span></div>{data.people.length ? <div className="connectionList">{data.people.map((person: any) => <Link className="panel connectionCard" href={`/usuarios/${person.username}`} key={person.id}><span className="avatar">{person.username.slice(0,1).toUpperCase()}</span><div><b>@{person.username}</b>{person.full_name && <span>{person.full_name}</span>}<small>{person.bio || "Jugador NIVOX"}</small></div></Link>)}</div> : <div className="panel emptyState"><h3>No sigue a nadie todavía</h3></div>}</div>;
}
